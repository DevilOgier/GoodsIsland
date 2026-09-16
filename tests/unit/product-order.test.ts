import test from 'node:test';
import assert from 'node:assert/strict';
import { compareProductsByReleaseDate } from '../../src/lib/product-order';

const products = [
  { id: 'a', releaseDate: null, createdAt: '2026-09-15T00:00:00.000Z' },
  { id: 'b', releaseDate: '2025-05-01T00:00:00.000Z', createdAt: '2026-09-14T00:00:00.000Z' },
  { id: 'c', releaseDate: '2026-01-01T00:00:00.000Z', createdAt: '2026-09-13T00:00:00.000Z' },
  { id: 'd', releaseDate: '2025-05-01T00:00:00.000Z', createdAt: '2026-09-16T00:00:00.000Z' },
];

test('商品按发售日期倒序，空日期置后，并使用创建时间与 ID 稳定排序', () => {
  assert.deepEqual([...products].sort(compareProductsByReleaseDate).map((item) => item.id), [
    'c',
    'd',
    'b',
    'a',
  ]);
});

test('筛选后的商品仍保持发售日期排序', () => {
  const allowed = new Set(['a', 'b', 'c']);
  const filtered = [...products]
    .sort(compareProductsByReleaseDate)
    .filter((item) => allowed.has(item.id));
  assert.deepEqual(filtered.map((item) => item.id), ['c', 'b', 'a']);
});
