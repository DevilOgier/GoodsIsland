import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDiskObject, putDiskObject } from '../../src/infrastructure/disk-storage';
test('磁盘对象存储：保存、替换、路径保护与缺失文件', async () => {
  const root = await mkdtemp(join(tmpdir(), 'guzi-disk-'));
  const previous = process.env.STORAGE_LOCAL_DIR;
  process.env.STORAGE_LOCAL_DIR = root;
  try {
    await putDiskObject('original/test-key', Buffer.from('original'));
    assert.equal(String(await readDiskObject('original/test-key')), 'original');
    await putDiskObject('original/test-key', Buffer.from('updated'));
    assert.equal(String(await readDiskObject('original/test-key')), 'updated');
    for (const key of [
      '../secret',
      'original/../../secret',
      '/etc/passwd',
      'C:\\secret',
      'original/..',
    ])
      await assert.rejects(putDiskObject(key, Buffer.from('x')), /Invalid storage key/);
    await assert.rejects(readDiskObject('original/missing'));
  } finally {
    if (previous === undefined) delete process.env.STORAGE_LOCAL_DIR;
    else process.env.STORAGE_LOCAL_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});
