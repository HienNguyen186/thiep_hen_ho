import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { readConfig } from './cloudflare-cli.mjs';

export const project = 'thiep-hen-ho-hiennguyen186';

export async function createPagesBuild() {
  const worker = readConfig();
  const root = resolve('.cloudflare-pages');
  mkdirSync(root, { recursive: true });
  const stage = mkdtempSync(join(root, 'build-'));
  const assets = join(stage, 'assets');
  cpSync('dist', assets, { recursive: true });
  await build({ entryPoints: ['worker/index.ts'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, outfile: join(assets, '_worker.js') });
  writeFileSync(join(assets, '_routes.json'), JSON.stringify({ version: 1, include: ['/api', '/api/*'], exclude: [] }, null, 2));
  writeFileSync(join(stage, 'wrangler.jsonc'), JSON.stringify({
    name: project,
    pages_build_output_dir: './assets',
    compatibility_date: worker.compatibility_date,
    d1_databases: worker.d1_databases,
  }, null, 2));
  console.log('Pages build prepared with the same Worker API and D1 binding.');
  return { stage, assets, project };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await createPagesBuild();
