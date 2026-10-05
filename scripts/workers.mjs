import { spawn } from 'node:child_process';
const children = ['src/workers/image-worker.ts', 'src/workers/catalog-worker.ts'].map((file) =>
  spawn(process.execPath, ['--import', 'tsx', file], { stdio: 'inherit', env: process.env }),
);
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1000);
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code || 1));
}
process.on('SIGTERM', () => stop(0));
process.on('SIGINT', () => stop(0));
