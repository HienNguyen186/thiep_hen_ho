import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');

export function runWrangler(args, { capture = false, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
      stdio: [input === undefined ? 'ignore' : 'pipe', capture ? 'pipe' : 'inherit', 'pipe'],
    });
    let output = '';
    let errors = '';
    child.stdout?.on('data', chunk => { output += chunk.toString(); });
    child.stderr.on('data', chunk => { errors += chunk.toString(); if (!capture) process.stderr.write(chunk); });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve(output) : reject(Object.assign(new Error(`Wrangler ${args[0]} failed (exit ${code}).`), { stderr: errors })));
    if (input !== undefined) child.stdin.end(input);
  });
}

export function readConfig() {
  return JSON.parse(readFileSync('wrangler.jsonc', 'utf8').split('\n').filter(line => !line.trimStart().startsWith('//')).join('\n'));
}

export function writeConfig(config) { writeFileSync('wrangler.jsonc', JSON.stringify(config, null, 2) + '\n'); }

export function remoteConfigured(config = readConfig()) {
  const id = config.d1_databases?.find(binding => binding.binding === 'DB')?.database_id;
  return typeof id === 'string' && id !== '00000000-0000-0000-0000-000000000000';
}
