import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSeriesPreviewProducts } from '../../src/components/product-picker';
import type { Product } from '../../src/components/types';
import { mapWithConcurrency } from '../../src/poster/assets';

test('系列拼图从大量商品中稳定选择最多四张', () => {
  const products = Array.from({ length: 101 }, (_, index) => ({
    id: `product-${index}`,
  })) as Product[];

  const first = selectSeriesPreviewProducts(products);
  const second = selectSeriesPreviewProducts(products);

  assert.deepEqual(
    first.map((product) => product.id),
    ['product-0', 'product-33', 'product-66', 'product-100'],
  );
  assert.deepEqual(second, first);
  assert.equal(first.length, 4);
});

test('系列商品不足四张时全部保留', () => {
  const products = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as Product[];
  assert.deepEqual(selectSeriesPreviewProducts(products), products);
});

test('高清素材加载器限制并发并保持输出顺序', async () => {
  let active = 0;
  let maximum = 0;
  const values = Array.from({ length: 12 }, (_, index) => index);
  const results = await mapWithConcurrency(values, 4, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return value * 2;
  });

  assert.equal(maximum, 4);
  assert.deepEqual(
    results,
    values.map((value) => value * 2),
  );
});
