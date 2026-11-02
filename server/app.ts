import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { responseSchema, type ResponseData } from '../shared/schema';
import { labels, dresscodes, foods, desserts, drinks, activities, returnTimes } from '../shared/options';

export function createApp(config: { databasePath: string; adminPassword: string; secureCookies?: boolean; staticPath?: string }) {
  if (config.adminPassword.length < 12) throw new Error('ADMIN_PASSWORD phải có ít nhất 12 ký tự. Hãy cấu hình .env trước khi chạy.');
  if (config.databasePath !== ':memory:') mkdirSync(dirname(resolve(config.databasePath)), { recursive: true });
  const db = new DatabaseSync(config.databasePath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS responses (id TEXT PRIMARY KEY, submission_id TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, viewed INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);`);
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'https://images.unsplash.com', 'data:'], 'font-src': ["'self'", 'https://fonts.gstatic.com'], 'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'] } }, strictTransportSecurity: config.secureCookies ? undefined : false }));
  app.use(express.json({ limit: '48kb' }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Yêu cầu khác nguồn không được phép.' });
      if (origin) { try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Yêu cầu khác nguồn không được phép.' }); } catch { return res.status(403).json({ error: 'Nguồn không hợp lệ.' }); } }
    }
    next();
  });
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const cookieName = config.secureCookies ? '__Host-date_session' : 'date_session';
  const cookieOptions = { httpOnly: true, secure: !!config.secureCookies, sameSite: 'strict' as const, path: '/' };
  function tokenFrom(cookie = '') { return cookie.split(';').map(c => c.trim()).find(c => c.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? ''; }
  const auth: RequestHandler = (req, res, next) => {
    const token = tokenFrom(req.headers.cookie);
    const session = token && db.prepare('SELECT expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?').get(hash(token), Date.now());
    if (!session) return void res.status(401).json({ error: 'Phiên đã hết hạn. Vui lòng đăng nhập lại.' });
    next();
  };
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/responses', rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Em thử gửi lại sau một phút nhé.' } }), (req, res) => {
    // Check the full schema before accepting an idempotent retry.
    const parsed = responseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message, issues: parsed.error.issues });
    const existing = db.prepare('SELECT id, payload FROM responses WHERE submission_id = ?').get(parsed.data.submissionId);
    if (existing) {
      if (existing.payload !== JSON.stringify(parsed.data)) return res.status(409).json({ error: 'Mã gửi này đã được dùng cho một câu trả lời khác.' });
      return res.json({ id: existing.id, duplicate: true });
    }
    const id = randomUUID();
    db.prepare('INSERT INTO responses (id, submission_id, created_at, payload) VALUES (?, ?, ?, ?)').run(id, parsed.data.submissionId, new Date().toISOString(), JSON.stringify(parsed.data));
    res.status(201).json({ id });
  });
  const salt = randomBytes(16);
  const expectedPassword = scryptSync(config.adminPassword, salt, 64);
  app.post('/api/admin/login', rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Đã thử quá nhiều lần. Vui lòng đợi 15 phút.' } }), (req, res) => {
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length > 256 || !timingSafeEqual(scryptSync(password, salt, 64), expectedPassword)) return res.status(401).json({ error: 'Mật khẩu chưa đúng.' });
    const previous = tokenFrom(req.headers.cookie);
    if (previous) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(previous));
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').run(hash(token), Date.now() + 8 * 60 * 60_000);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: 8 * 60 * 60_000 }).json({ ok: true });
  });
  app.use('/api/admin', auth);
  app.post('/api/admin/logout', (req, res) => { db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(tokenFrom(req.headers.cookie))); res.clearCookie(cookieName, cookieOptions).json({ ok: true }); });
  const mapRow = (row: Record<string, unknown>) => ({ id: row.id, createdAt: row.created_at, viewed: !!row.viewed, data: JSON.parse(String(row.payload)) as ResponseData });
  app.get('/api/admin/responses', (_req, res) => res.json(db.prepare('SELECT * FROM responses ORDER BY created_at DESC LIMIT 1000').all().map(mapRow)));
  app.get('/api/admin/responses/export', (_req, res) => {
    const cell = (value: unknown) => { let text = String(value ?? ''); if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
    const rows: unknown[][] = [['ID', 'Ngày gửi (UTC)', 'Đã xem', 'Ngày và giờ rảnh', 'Trang phục', 'Ghi chú trang phục', 'Món ăn', 'Tráng miệng', 'Đồ uống', 'Hoạt động', 'Giờ về', 'Ghi chú giờ về', 'Lời nhắn']];
    for (const row of db.prepare('SELECT * FROM responses ORDER BY created_at DESC').all()) {
      const r = mapRow(row); const d = r.data;
      rows.push([r.id, r.createdAt, r.viewed ? 'Có' : 'Chưa', d.flexibleDate ? 'Ngày nào cũng được' : d.availableDates.map(day => `${day.date}: ${day.timeSlots.map(s => `${s.start}–${s.end}`).join(', ')}`).join('; '), labels(d.dresscodes, dresscodes), d.dresscodeNote, labels(d.foods, foods), labels(d.desserts, desserts), labels(d.drinks, drinks), labels(d.activities, activities), d.returnTime === 'specific' ? d.specificReturnTime : labels([d.returnTime], returnTimes), d.returnNote, d.notes]);
    }
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="date-with-you.csv"' }).send('\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n'));
  });
  app.get('/api/admin/responses/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM responses WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Không tìm thấy câu trả lời.' });
    db.prepare('UPDATE responses SET viewed = 1 WHERE id = ?').run(req.params.id);
    res.json({ ...mapRow(row), viewed: true });
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API không tồn tại.' }); });
  if (config.staticPath) { app.use(express.static(config.staticPath)); app.get('/{*path}', (_req, res) => res.sendFile(resolve(config.staticPath!, 'index.html'))); }
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => { const badRequest = error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large'; res.status(badRequest ? 400 : 500).json({ error: badRequest ? 'Dữ liệu gửi lên không hợp lệ hoặc quá lớn.' : 'Không thể lưu lúc này. Vui lòng thử lại.' }); };
  app.use(errorHandler);
  return { app, db };
}
