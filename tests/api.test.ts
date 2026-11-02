import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app';
import { newDraft, futureDate, responseSchema } from '../shared/schema';
import { createServer } from 'vite';
import viteConfig from '../vite.config';
const password = 'test-password-just-for-tests';
const fixture = () => ({ ...newDraft(), availableDates: [{ date: futureDate(), timeSlots: [{ start: '14:00', end: '17:00' }, { start: '18:00', end: '22:00' }] }], dresscodes: ['casual', 'couple'], foods: ['japanese', 'italian'], activities: ['walk', 'photobooth'], returnTime: 'specific', specificReturnTime: '21:30', notes: 'Không ăn đậu phộng.' });
test('schema validates multiple days, slots, choices and independent return time', () => {
  const data = fixture(); const day = new Date(`${futureDate()}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + 1);
  data.availableDates.push({ date: day.toISOString().slice(0, 10), timeSlots: [{ start: '10:00', end: '12:00' }] });
  assert.equal(responseSchema.safeParse(data).success, true);
});
test('schema rejects past/impossible/duplicate dates, invalid slots and unsupported choices', () => {
  for (const data of [
    { ...fixture(), availableDates: [{ date: '2000-01-01', timeSlots: [{ start: '18:00', end: '21:00' }] }] },
    { ...fixture(), availableDates: [{ date: '2099-02-30', timeSlots: [{ start: '18:00', end: '21:00' }] }] },
    { ...fixture(), availableDates: [{ date: futureDate(), timeSlots: [] }] },
    { ...fixture(), availableDates: [{ date: futureDate(), timeSlots: [{ start: '21:00', end: '18:00' }] }] },
    { ...fixture(), availableDates: [fixture().availableDates[0], fixture().availableDates[0]] },
    { ...fixture(), foods: ['unknown'] }, { ...fixture(), foods: ['italian', 'no-preference'] },
    { ...fixture(), dresscodes: [] }, { ...fixture(), specificReturnTime: '25:00' },
    { ...fixture(), notes: 'x'.repeat(2001) }, { ...fixture(), flexibleDate: true },
  ]) assert.equal(responseSchema.safeParse(data).success, false);
});
test('flexible dates, optional desserts/notes, flexible return time work', () => {
  assert.equal(responseSchema.safeParse({ ...fixture(), flexibleDate: true, availableDates: [], returnTime: 'flexible', specificReturnTime: '', desserts: [], drinks: [], notes: '' }).success, true);
});
test('API saves once on retry, rejects changed payload and malformed input', async () => {
  const { app, db } = createApp({ databasePath: ':memory:', adminPassword: password });
  try {
    const data = fixture(); const first = await request(app).post('/api/responses').send(data).expect(201);
    const retry = await request(app).post('/api/responses').send(data).expect(200);
    assert.equal(retry.body.id, first.body.id); assert.equal(retry.body.duplicate, true);
    await request(app).post('/api/responses').send({ ...data, notes: 'Changed' }).expect(409);
    await request(app).post('/api/responses').send({ foods: ['bad'] }).expect(400);
    await request(app).post('/api/responses').set('Content-Type', 'application/json').send('{oops').expect(400);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM responses').get()?.n, 1);
  } finally { db.close(); }
});
test('admin endpoints require auth; password, cookies, details, viewed status, CSV and logout work', async () => {
  const { app, db } = createApp({ databasePath: ':memory:', adminPassword: password });
  try {
    const data = { ...fixture(), notes: '=HYPERLINK("bad")\nKhông ăn đậu phộng, cảm ơn anh.' };
    const saved = await request(app).post('/api/responses').send(data).expect(201);
    for (const path of ['/api/admin/responses', '/api/admin/responses/export', `/api/admin/responses/${saved.body.id}`]) await request(app).get(path).expect(401);
    await request(app).post('/api/admin/login').send({ password: 'incorrect' }).expect(401);
    const agent = request.agent(app);
    const login = await agent.post('/api/admin/login').send({ password }).expect(200);
    assert.match(String(login.headers['set-cookie']), /HttpOnly/); assert.match(String(login.headers['set-cookie']), /SameSite=Strict/);
    const list = await agent.get('/api/admin/responses').expect(200); assert.equal(list.body[0].viewed, false);
    const detail = await agent.get(`/api/admin/responses/${saved.body.id}`).expect(200); assert.deepEqual(detail.body.data, data); assert.equal(detail.body.viewed, true);
    assert.equal((await agent.get('/api/admin/responses')).body[0].viewed, true);
    await agent.get('/api/admin/responses/not-found').expect(404);
    const csv = await agent.get('/api/admin/responses/export').expect(200);
    assert.match(csv.headers['content-type'], /text\/csv/); assert.match(csv.text, /Không ăn đậu phộng/); assert.match(csv.text, /'=HYPERLINK/); assert.match(csv.text, /21:30/);
    await agent.post('/api/admin/logout').expect(200); await agent.get('/api/admin/responses').expect(401);
  } finally { db.close(); }
});
test('rejects cross-origin and cross-site writes', async () => {
  const { app, db } = createApp({ databasePath: ':memory:', adminPassword: password });
  try { await request(app).post('/api/responses').set('Origin', 'https://untrusted.example').send(fixture()).expect(403); await request(app).post('/api/admin/login').set('Sec-Fetch-Site', 'cross-site').send({ password }).expect(403); } finally { db.close(); }
});
test('database records persist after closing and reopening server', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'date-with-you-test-')); const path = join(directory, 'test.sqlite');
  let instance = createApp({ databasePath: path, adminPassword: password });
  try {
    const data = fixture(); const saved = await request(instance.app).post('/api/responses').send(data).expect(201);
    instance.db.close(); instance = createApp({ databasePath: path, adminPassword: password });
    const agent = request.agent(instance.app); await agent.post('/api/admin/login').send({ password }).expect(200);
    const detail = await agent.get(`/api/admin/responses/${saved.body.id}`).expect(200); assert.deepEqual(detail.body.data, data);
  } finally { instance.db.close(); rmSync(directory, { recursive: true, force: true }); }
});
test('admin sessions expire and unsafe configuration fails closed', async () => {
  assert.throws(() => createApp({ databasePath: ':memory:', adminPassword: '' }), /ADMIN_PASSWORD/);
  const { app, db } = createApp({ databasePath: ':memory:', adminPassword: password });
  try { const agent = request.agent(app); await agent.post('/api/admin/login').send({ password }).expect(200); db.prepare('UPDATE sessions SET expires_at = ?').run(Date.now() - 1); await agent.get('/api/admin/responses').expect(401); } finally { db.close(); }
});
test('Vite proxy preserves the browser origin for response submission', async () => {
  const { app, db } = createApp({ databasePath: ':memory:', adminPassword: password });
  const apiServer = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => apiServer.once('listening', resolve));
  const address = apiServer.address();
  if (!address || typeof address === 'string') throw new Error('Missing API port');
  const config = viteConfig({ command: 'serve', mode: 'development' });
  const proxy = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0, proxy: { '/api': { ...config.server!.proxy!['/api'] as object, target: `http://127.0.0.1:${address.port}` } } }, logLevel: 'silent' });
  try {
    await proxy.listen();
    const frontendAddress = proxy.httpServer!.address();
    if (!frontendAddress || typeof frontendAddress === 'string') throw new Error('Missing frontend port');
    const origin = `http://127.0.0.1:${frontendAddress.port}`;
    const response = await fetch(`${origin}/api/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(fixture()) });
    assert.equal(response.status, 201);
  } finally { await proxy.close(); await new Promise<void>((resolve, reject) => apiServer.close(error => error ? reject(error) : resolve())); db.close(); }
});
