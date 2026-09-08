import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
if (!existsSync('.env')) {
  console.error('请先运行 pnpm local:setup');
  process.exit(1);
}
const children = [
  spawn(process.execPath, ['--env-file=.env', 'scripts/services.mjs'], {
    stdio: 'inherit',
    windowsHide: true,
  }),
  spawn(process.execPath, ['--env-file=.env', '--import', 'tsx', 'src/workers/image-worker.ts'], {
    stdio: 'inherit',
    windowsHide: true,
  }),
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], {
    stdio: 'inherit',
    windowsHide: true,
  }),
];
process.on('SIGINT', () => {
  children.forEach((p) => p.kill());
  process.exit(0);
});
