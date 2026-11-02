import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app';
const { app, db } = createApp({ databasePath: process.env.DATABASE_PATH || './data/date-with-you.sqlite', adminPassword: process.env.ADMIN_PASSWORD || '', secureCookies: process.env.COOKIE_SECURE === 'true', staticPath: existsSync('dist/index.html') ? resolve('dist') : undefined });
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, '127.0.0.1', () => console.log(`Date with you API & production: http://127.0.0.1:${port}`));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
