import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { createPagesBuild } from './build-pages.mjs';
import { remoteConfigured, runWrangler } from './cloudflare-cli.mjs';

try {
  if (!remoteConfigured()) throw new Error('Run npm run cf:setup first.');
  await runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote']);
  const { stage, project } = await createPagesBuild();
  const projects = JSON.parse(await runWrangler(['pages', 'project', 'list', '--json'], { capture: true }));
  if (!projects.some(item => item.name === project)) {
    // Explicit Pages creation avoids Wrangler delegating a new project to workers.dev.
    await runWrangler(['pages', 'project', 'create', project, '--production-branch', 'main', '--compatibility-date', '2026-11-02', '--force', '--cwd', stage]);
  }
  const secrets = await runWrangler(['pages', 'secret', 'list', '--project-name', project, '--cwd', stage], { capture: true });
  if (!/\bADMIN_PASSWORD\b/.test(secrets)) {
    const local = existsSync('.dev.vars') ? parse(readFileSync('.dev.vars')) : existsSync('.env') ? parse(readFileSync('.env')) : {};
    if (!local.ADMIN_PASSWORD || local.ADMIN_PASSWORD.length < 12) throw new Error('Set ADMIN_PASSWORD in .dev.vars before the first Pages deployment.');
    await runWrangler(['pages', 'secret', 'put', 'ADMIN_PASSWORD', '--project-name', project, '--cwd', stage], { input: local.ADMIN_PASSWORD + '\n' });
  }
  await runWrangler(['pages', 'deploy', 'assets', '--project-name', project, '--branch', 'main', '--commit-dirty=true', '--cwd', stage]);
} catch (error) { console.error(error.message); if (error.stderr) console.error(error.stderr); process.exitCode = 1; }
