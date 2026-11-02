import { readConfig, remoteConfigured, runWrangler, writeConfig } from './cloudflare-cli.mjs';

try {
  const config = readConfig();
  const binding = config.d1_databases.find(binding => binding.binding === 'DB');
  if (remoteConfigured(config)) {
    await runWrangler(['d1', 'info', binding.database_name]);
    console.log('D1 binding is already configured. Existing database preserved.');
  } else {
    const list = () => runWrangler(['d1', 'list', '--json'], { capture: true }).then(output => JSON.parse(output));
    let database = (await list()).find(database => database.name === binding.database_name);
    if (!database) {
      await runWrangler(['d1', 'create', binding.database_name, '--location', 'apac']);
      database = (await list()).find(database => database.name === binding.database_name);
    }
    if (!database?.uuid) throw new Error('D1 was not found after creation. Inspect the dashboard before retrying.');
    binding.database_id = database.uuid;
    writeConfig(config);
    console.log('D1 database ID saved in wrangler.jsonc.');
  }
  await runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
  console.log('D1 is ready. Next: npm run deploy.');
} catch (error) {
  console.error(error.message);
  console.error('If authentication is missing, run npm run cf:login and complete Cloudflare login, then retry.');
  process.exitCode = 1;
}
