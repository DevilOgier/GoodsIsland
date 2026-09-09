import { mkdir, readFile, writeFile, rename, stat, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
function objectPath(key: string) {
  if (!/^[a-z]+\/[a-zA-Z0-9-]+$/.test(key)) throw Error('Invalid storage key');
  return resolve(process.env.STORAGE_LOCAL_DIR ?? '.local/assets', key);
}
export async function readDiskObject(key: string) {
  const path = objectPath(key);
  const meta = await stat(path);
  if (!meta.isFile() || meta.size === 0 || meta.size > 40 * 1024 * 1024)
    throw Error('图片大小不符合限制');
  return readFile(path);
}
export async function putDiskObject(key: string, bytes: Buffer) {
  const path = objectPath(key);
  await mkdir(dirname(path), { recursive: true });
  const temp = path + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, bytes, { flag: 'wx', mode: 0o600 });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
