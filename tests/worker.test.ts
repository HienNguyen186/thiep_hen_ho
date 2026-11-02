import { before, test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from 'miniflare';
import { futureDate, newDraft } from '../shared/schema';

const password = 'worker-test-password-just-for-tests';
const fixture = () => ({ ...newDraft(), availableDates: [{ date: futureDate(), timeSlots: [{ start: '14:00', end: '17:00' }, { start: '18:00', end: '22:00' }] }], dresscodes: ['casual', 'couple'], foods: ['japanese', 'italian'], desserts: ['ice-cream'], drinks: ['matcha'], activities: ['walk', 'photobooth'], returnTime: 'specific', specificReturnTime: '21:30', notes: 'Không ăn đậu phộng.' });
let script = '';
before(async () => {
  const bundle = await build({ entryPoints: ['worker/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  script = bundle.outputFiles[0].text;
});
function runtime(secret = password, persist?: string) {
  return new Miniflare({ ...convertV4MiniflareOptions({ script, modules: true, compatibilityDate: '2026-11-02', d1Databases: { DB: 'test-date-with-you' }, bindings: { ADMIN_PASSWORD: secret }, log: new Log(LogLevel.NONE), host: '127.0.0.1' }), resourcePersistencePath: persist });
}
async function migrate(mf: Miniflare) {
  const db = await mf.getD1Database('DB');
  for (const sql of readFileSync('migrations/0001_initial.sql', 'utf8').split(';').map(sql => sql.trim()).filter(Boolean)) await db.prepare(sql).run();
  return db;
}
async function setup(t: TestContext) { const mf = runtime(); t.after(() => mf.dispose()); const db = await migrate(mf); return { mf, db }; }
const headers = { 'Content-Type': 'application/json', Origin: 'https://date.test', 'CF-Connecting-IP': '192.0.2.1' };
async function post(mf: Miniflare, path: string, body: unknown, extra: Record<string, string> = {}) {
  return mf.dispatchFetch(`https://date.test/api${path}`, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body) });
}
async function login(mf: Miniflare) {
  const response = await post(mf, '/admin/login', { password });
  assert.equal(response.status, 200, await response.clone().text());
  return response.headers.get('Set-Cookie')!.split(';')[0];
}

test('Worker runs on workerd with real D1; health and input errors have security headers', async t => {
  const { mf } = await setup(t);
  const health = await mf.dispatchFetch('https://date.test/api/health');
  assert.equal(health.status, 200); assert.deepEqual(await health.json(), { ok: true });
  assert.equal(health.headers.get('Cache-Control'), 'no-store'); assert.equal(health.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal((await post(mf, '/responses', {})).status, 400);
  const invalid = await mf.dispatchFetch('https://date.test/api/responses', { method: 'POST', headers, body: '{bad' });
  assert.equal(invalid.status, 400);
  const tooLarge = await mf.dispatchFetch('https://date.test/api/responses', { method: 'POST', headers, body: JSON.stringify({ notes: 'x'.repeat(50_000) }) });
  assert.equal(tooLarge.status, 413);
  const wrongType = await mf.dispatchFetch('https://date.test/api/responses', { method: 'POST', body: 'text' });
  assert.equal(wrongType.status, 415);
});

test('D1 idempotency handles concurrent requests and rejects changed content', async t => {
  const { mf, db } = await setup(t);
  const data = fixture();
  const attempts = await Promise.all(Array.from({ length: 5 }, () => post(mf, '/responses', data)));
  assert.equal(attempts.filter(response => response.status === 201).length, 1);
  assert.equal(attempts.filter(response => response.status === 200).length, 4);
  const ids = await Promise.all(attempts.map(async response => (await response.json() as { id: string }).id));
  assert.equal(new Set(ids).size, 1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM responses').first<{ n: number }>())?.n, 1);
  assert.equal((await post(mf, '/responses', { ...data, notes: 'changed' })).status, 409);
});

test('Worker admin login, secure cookie, list/detail, viewed status, CSV and logout', async t => {
  const { mf, db } = await setup(t);
  const data = { ...fixture(), notes: '=HYPERLINK("bad")\nKhông ăn đậu phộng, cảm ơn anh.' };
  const saved = await post(mf, '/responses', data); assert.equal(saved.status, 201);
  const { id } = await saved.json() as { id: string };
  for (const path of ['/admin/responses', '/admin/responses/export', `/admin/responses/${id}`]) assert.equal((await mf.dispatchFetch(`https://date.test/api${path}`)).status, 401);
  assert.equal((await post(mf, '/admin/login', { password: 'wrong' })).status, 401);
  const signIn = await post(mf, '/admin/login', { password });
  assert.equal(signIn.status, 200);
  const setCookie = signIn.headers.get('Set-Cookie')!;
  assert.match(setCookie, /^__Host-date_session=/); assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Strict/);
  const Cookie = setCookie.split(';')[0];
  const list = await mf.dispatchFetch('https://date.test/api/admin/responses', { headers: { Cookie } });
  const rows = await list.json() as { viewed: boolean }[]; assert.equal(rows[0].viewed, false);
  const detail = await mf.dispatchFetch(`https://date.test/api/admin/responses/${id}`, { headers: { Cookie } });
  assert.deepEqual(await detail.json(), { id, createdAt: (await db.prepare('SELECT created_at FROM responses WHERE id = ?').bind(id).first())?.created_at, viewed: true, data });
  const csv = await mf.dispatchFetch('https://date.test/api/admin/responses/export', { headers: { Cookie } });
  assert.equal(csv.status, 200); assert.match(csv.headers.get('Content-Type')!, /text\/csv/);
  const bytes = new Uint8Array(await csv.arrayBuffer()); assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
  const contents = new TextDecoder().decode(bytes); assert.match(contents, /'=HYPERLINK/); assert.match(contents, /Không ăn đậu phộng/); assert.match(contents, /21:30/);
  const rawToken = Cookie.split('=')[1];
  assert.notEqual((await db.prepare('SELECT token_hash FROM sessions').first())?.token_hash, rawToken);
  const signedOut = await post(mf, '/admin/logout', {}, { Cookie }); assert.equal(signedOut.status, 200); assert.match(signedOut.headers.get('Set-Cookie')!, /Max-Age=0/);
  assert.equal((await mf.dispatchFetch('https://date.test/api/admin/responses', { headers: { Cookie } })).status, 401);
});

test('Worker rejects cross-origin writes, opaque origins and cross-site requests', async t => {
  const { mf } = await setup(t);
  const attacks: Record<string, string>[] = [{ Origin: 'https://untrusted.test' }, { Origin: 'http://date.test' }, { Origin: 'null' }, { 'Sec-Fetch-Site': 'cross-site' }];
  for (const extra of attacks) {
    assert.equal((await post(mf, '/responses', fixture(), extra)).status, 403);
  }
  const missing = await mf.dispatchFetch('https://date.test/api/no-such-api', { headers: { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' } });
  assert.equal(missing.status, 404); assert.match(missing.headers.get('Content-Type')!, /application\/json/);
});

test('D1 responses and sessions persist across Worker restarts; password change revokes sessions', async () => {
  const path = mkdtempSync(join(tmpdir(), 'date-worker-persist-'));
  let mf = runtime(password, path);
  try {
    await migrate(mf);
    const saved = await post(mf, '/responses', fixture()); const { id } = await saved.json() as { id: string };
    const Cookie = await login(mf);
    await mf.dispose(); mf = runtime(password, path);
    assert.equal((await mf.dispatchFetch(`https://date.test/api/admin/responses/${id}`, { headers: { Cookie } })).status, 200);
    await mf.dispose(); mf = runtime('different-admin-password-for-test', path);
    assert.equal((await mf.dispatchFetch('https://date.test/api/admin/responses', { headers: { Cookie } })).status, 401);
  } finally { await mf.dispose(); rmSync(path, { recursive: true, force: true }); }
});

test('login rate limits are stored in D1 and isolate clients by IP', async t => {
  const { mf } = await setup(t);
  for (let i = 0; i < 8; i++) assert.equal((await post(mf, '/admin/login', { password: 'wrong' })).status, 401);
  const blocked = await post(mf, '/admin/login', { password }); assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
  assert.equal((await post(mf, '/admin/login', { password }, { 'CF-Connecting-IP': '192.0.2.2' })).status, 200);
});

test('D1 expired sessions and missing deployment secret fail closed', async t => {
  const { mf, db } = await setup(t);
  const Cookie = await login(mf);
  await db.prepare('UPDATE sessions SET expires_at = ?').bind(Date.now() - 1).run();
  assert.equal((await mf.dispatchFetch('https://date.test/api/admin/responses', { headers: { Cookie } })).status, 401);
  const unconfigured = runtime('');
  t.after(() => unconfigured.dispose());
  assert.equal((await unconfigured.dispatchFetch('https://date.test/api/health')).status, 503);
});

test('CSV streams across D1 pages without truncating records', async t => {
  const { mf, db } = await setup(t);
  const data = fixture();
  const records = Array.from({ length: 105 }, (_, i) => ({ id: `row-${String(i).padStart(3, '0')}`, payload: JSON.stringify({ ...data, submissionId: crypto.randomUUID(), notes: 'Pagination record' }) }));
  for (let offset = 0; offset < records.length; offset += 50) {
    await db.batch(records.slice(offset, offset + 50).map(record => db.prepare('INSERT INTO responses (id, submission_id, created_at, payload) VALUES (?, ?, ?, ?)').bind(record.id, record.id, '2026-11-02T00:00:00.000Z', record.payload)));
  }
  const Cookie = await login(mf);
  const csv = await mf.dispatchFetch('https://date.test/api/admin/responses/export', { headers: { Cookie } });
  const text = await csv.text(); assert.equal(text.trim().split('\r\n').length, 106);
  for (const record of records) assert.ok(text.includes(record.id));
});
