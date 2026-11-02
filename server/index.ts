import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app';
const { app, db } = createApp({ databasePath: process.env.DATABASE_PATH || './data/date-with-you.sqlite', adminPassword: process.env.ADMIN_PASSWORD || '', secureCookies: process.env.COOKIE_SECURE === 'true', staticPath: existsSync('dist/index.html') ? resolve('dist') : undefined });
const port = Number(process.env.PORT || 3001);
const isRender = process.env.RENDER === 'true';
const host = process.env.HOST || (isRender ? '0.0.0.0' : '127.0.0.1');
// Render terminates HTTPS and forwards requests through its reverse proxy.
if (isRender) app.set('trust proxy', 1);
const server = app.listen(port, host, () => console.log(`Date with you API & production: http://${host}:${port}`));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
