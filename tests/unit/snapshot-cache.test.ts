import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotCache } from '../../src/lib/snapshot-cache';

test('页面缓存复用、强制刷新和账号隔离', async () => {
  const cache = createSnapshotCache<number>();
  let requests = 0;
  const fetcher = async () => ++requests;
  assert.equal(await cache.load('a', fetcher), 1);
  assert.equal(await cache.load('a', fetcher), 1);
  assert.equal(await cache.load('a', fetcher, true), 2);
  assert.equal(await cache.load('b', fetcher), 3);
  cache.clear();
  assert.equal(await cache.load('b', fetcher), 4);
});

test('过期后重新读取，退出时未完成的请求不能重建缓存', async () => {
  const expired = createSnapshotCache<number>(-1);
  let requests = 0;
  assert.equal(await expired.load('a', async () => ++requests), 1);
  assert.equal(await expired.load('a', async () => ++requests), 2);
  const cache = createSnapshotCache<number>();
  let resolve!: (value: number) => void;
  const pending = cache.load(
    'a',
    () =>
      new Promise<number>((done) => {
        resolve = done;
      }),
  );
  cache.clear();
  resolve(1);
  await pending;
  assert.equal(await cache.load('a', async () => 2), 2);
});
