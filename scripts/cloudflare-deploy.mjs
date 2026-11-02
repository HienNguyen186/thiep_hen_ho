import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { readConfig, remoteConfigured, runWrangler } from './cloudflare-cli.mjs';

try {
  if (!remoteConfigured()) throw new Error('D1 is not configured. Run npm run cf:setup first.');
  await runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
  const config = readConfig();
  let secrets;
  try { secrets = JSON.parse(await runWrangler(['secret', 'list'], { capture: true })); }
  catch (error) {
    if (/10007|script.*not found|worker[^\n]*not found|worker.*does not exist/i.test(error.stderr ?? '')) secrets = [];
    else throw error;
  }
  if (!secrets.some(secret => secret.name === 'ADMIN_PASSWORD')) {
    const local = existsSync('.dev.vars') ? parse(readFileSync('.dev.vars')) : existsSync('.env') ? parse(readFileSync('.env')) : {};
    if (!local.ADMIN_PASSWORD || local.ADMIN_PASSWORD.length < 12) throw new Error('Set the production secret with: npx wrangler secret put ADMIN_PASSWORD');
    // Secret bytes go through stdin only, never argv, source control, or logs.
    await runWrangler(['secret', 'put', 'ADMIN_PASSWORD'], { input: local.ADMIN_PASSWORD + '\n' });
  }
  await runWrangler(['deploy']);
  console.log(`Deployment finished for ${config.name}. Use the URL printed by Wrangler above.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
