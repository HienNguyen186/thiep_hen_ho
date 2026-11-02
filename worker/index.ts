import { responseSchema, type ResponseData } from '../shared/schema';
import { readJson, HttpError } from './body';
import { csvStream } from './csv';
import { hash, newToken, passwordMatches, readToken, securityHeaders, sessionCookie, sessionHash } from './security';
import type { Env, ResponseRow } from './types';

function json(request: Request, data: unknown, status = 200, extra?: Record<string, string>) {
  const headers = securityHeaders(request);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(extra ?? {})) headers.set(key, value);
  return new Response(JSON.stringify(data), { status, headers });
}

function requireSameOrigin(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new HttpError(403, 'Yêu cầu khác nguồn không được phép.');
  const origin = request.headers.get('Origin');
  if (!origin) return; // Non-browser clients still require authentication on admin routes.
  try {
    if (new URL(origin).origin === new URL(request.url).origin) return;
  } catch { /* Invalid or opaque Origin is denied. */ }
  throw new HttpError(403, 'Yêu cầu khác nguồn không được phép.');
}

async function rateLimit(request: Request, env: Env, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  // Cloudflare sets this header at the edge. Do not trust user-supplied X-Forwarded-For.
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const key = await hash(`${scope}:${ip}:${window}`);
  const expiry = (window + 1) * windowMs;
  const results = await env.DB.batch<{ request_count: number }>([
    env.DB.prepare('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at <= ? LIMIT 100)').bind(now),
    env.DB.prepare('INSERT INTO rate_limits (key, request_count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET request_count = request_count + 1 RETURNING request_count').bind(key, expiry),
  ]);
  const count = results[1].results[0]?.request_count;
  if (count === undefined) throw new Error('Rate limit state unavailable');
  return { allowed: count <= limit, retryAfter: Math.max(1, Math.ceil((expiry - now) / 1000)) };
}

async function authorize(request: Request, env: Env) {
  const token = readToken(request);
  if (token) {
    const session = await env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?')
      .bind(await sessionHash(token, env.ADMIN_PASSWORD), Date.now()).first();
    if (session) return token;
  }
  throw new HttpError(401, 'Phiên đã hết hạn. Vui lòng đăng nhập lại.');
}

function mapRow(row: ResponseRow) {
  return { id: row.id, createdAt: row.created_at, viewed: !!row.viewed, data: JSON.parse(row.payload) as ResponseData };
}

async function api(request: Request, env: Env) {
  requireSameOrigin(request);
  if (!env.DB || typeof env.ADMIN_PASSWORD !== 'string' || env.ADMIN_PASSWORD.length < 12) {
    throw new HttpError(503, 'Máy chủ chưa được cấu hình đầy đủ. Vui lòng kiểm tra D1 và mật khẩu quản trị.');
  }
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  const method = request.method;

  if (path === '/api/health' && method === 'GET') {
    // Verify that migrations have been applied, without reading response contents.
    await env.DB.prepare('SELECT id FROM responses LIMIT 1').first();
    return json(request, { ok: true });
  }

  if (path === '/api/responses' && method === 'POST') {
    const rate = await rateLimit(request, env, 'responses', 12, 60_000);
    if (!rate.allowed) return json(request, { error: 'Em thử gửi lại sau một phút nhé.' }, 429, { 'Retry-After': String(rate.retryAfter) });
    const parsed = responseSchema.safeParse(await readJson(request));
    if (!parsed.success) return json(request, { error: parsed.error.issues[0].message, issues: parsed.error.issues }, 400);

    const id = crypto.randomUUID();
    const payload = JSON.stringify(parsed.data);
    // UNIQUE + ON CONFLICT also protects concurrent requests in different Worker isolates.
    await env.DB.prepare('INSERT INTO responses (id, submission_id, created_at, payload) VALUES (?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING')
      .bind(id, parsed.data.submissionId, new Date().toISOString(), payload).run();
    const saved = await env.DB.prepare('SELECT id, payload FROM responses WHERE submission_id = ?').bind(parsed.data.submissionId).first<{ id: string; payload: string }>();
    if (!saved) throw new Error('Response not persisted');
    if (saved.payload !== payload) return json(request, { error: 'Mã gửi này đã được dùng cho một câu trả lời khác.' }, 409);
    return saved.id === id ? json(request, { id }, 201) : json(request, { id: saved.id, duplicate: true });
  }

  if (path === '/api/admin/login' && method === 'POST') {
    const rate = await rateLimit(request, env, 'login', 8, 15 * 60_000);
    if (!rate.allowed) return json(request, { error: 'Đã thử quá nhiều lần. Vui lòng đợi 15 phút.' }, 429, { 'Retry-After': String(rate.retryAfter) });
    const body = await readJson(request);
    const password = body && typeof body === 'object' && 'password' in body ? body.password : undefined;
    if (typeof password !== 'string' || password.length > 256 || !await passwordMatches(password, env.ADMIN_PASSWORD)) {
      return json(request, { error: 'Mật khẩu chưa đúng.' }, 401);
    }
    const token = newToken();
    const previous = readToken(request);
    const statements = [env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now())];
    if (previous) statements.push(env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sessionHash(previous, env.ADMIN_PASSWORD)));
    statements.push(env.DB.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').bind(await sessionHash(token, env.ADMIN_PASSWORD), Date.now() + 8 * 60 * 60_000));
    await env.DB.batch(statements);
    return json(request, { ok: true }, 200, { 'Set-Cookie': sessionCookie(request, token) });
  }

  if (path === '/api/admin' || path.startsWith('/api/admin/')) {
    const token = await authorize(request, env);
    if (path === '/api/admin/logout' && method === 'POST') {
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sessionHash(token, env.ADMIN_PASSWORD)).run();
      return json(request, { ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', true) });
    }

    if (path === '/api/admin/responses' && method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM responses ORDER BY created_at DESC, id DESC LIMIT 1000').all<ResponseRow>();
      return json(request, rows.results.map(mapRow));
    }

    if (path === '/api/admin/responses/export' && method === 'GET') {
      const headers = securityHeaders(request);
      headers.set('Content-Type', 'text/csv; charset=utf-8');
      headers.set('Content-Disposition', 'attachment; filename="date-with-you.csv"');
      return new Response(csvStream(env.DB), { headers });
    }

    if (path.startsWith('/api/admin/responses/') && method === 'GET') {
      const id = path.slice('/api/admin/responses/'.length);
      const row = await env.DB.prepare('SELECT * FROM responses WHERE id = ?').bind(id).first<ResponseRow>();
      if (!row) return json(request, { error: 'Không tìm thấy câu trả lời.' }, 404);
      await env.DB.prepare('UPDATE responses SET viewed = 1 WHERE id = ?').bind(id).run();
      return json(request, { ...mapRow(row), viewed: true });
    }
  }
  return json(request, { error: 'API không tồn tại.' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path !== '/api' && !path.startsWith('/api/')) return env.ASSETS.fetch(request);
    try { return await api(request, env); }
    catch (error) {
      if (error instanceof HttpError) return json(request, { error: error.message }, error.status);
      console.error('Date with you API: request failed. Check D1 binding and migrations.');
      return json(request, { error: 'Không thể xử lý lúc này. Vui lòng thử lại.' }, 500);
    }
  },
};
