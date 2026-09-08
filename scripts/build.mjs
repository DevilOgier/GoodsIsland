import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  windowsHide: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);
mkdirSync('.next/standalone/.next', { recursive: true });
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
