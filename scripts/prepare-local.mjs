import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { parse } from 'dotenv';

if (!existsSync('.dev.vars')) {
  const previous = existsSync('.env') ? parse(readFileSync('.env')).ADMIN_PASSWORD : '';
  const password = previous?.length >= 12 ? previous : randomBytes(24).toString('hex');
  writeFileSync('.dev.vars', `# Local Worker secret; never commit this file.\nADMIN_PASSWORD=${JSON.stringify(password)}\n`, { mode: 0o600 });
  console.log('Local admin password is saved in .dev.vars (reused from .env when available).');
}
