import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../../src/components/types';
import { catalogExportPages, renderCatalogSheet } from '../../src/catalog/export';
function product(i: number, type = 'BADGE', character = 'a') {
  return {
    id: String(i),
    name: '商品' + i,
    productType: type,
    releaseDate: i === 0 ? null : '2026-09-' + String((i % 28) + 1).padStart(2, '0'),
    createdAt: '2026-01-01',
    series: { character: { id: character } },
  } as Product;
}
test('类型图鉴覆盖全部筛选结果，按时间倒序且默认单张长图无遗漏', () => {
  const input = [
    ...Array.from({ length: 71 }, (_, i) => product(i)),
    product(100, 'STANDEE'),
    product(101, 'BADGE', 'b'),
  ];
  const before = JSON.stringify(input);
  const pages = catalogExportPages(input, 'BADGE', 'a');
  assert.deepEqual(
    pages.map((p) => p.length),
    [71],
  );
  assert.equal(new Set(pages.flat().map((p) => p.id)).size, 71);
  assert.equal(pages.at(-1)?.at(-1)?.id, '0');
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(catalogExportPages(input, 'MISSING'), []);
});
test('图鉴 SVG 安全转义、保留图片比例、截断长名，日期可隐藏', () => {
  const data = [
    {
      name: '<script>alert("x")</script>' + '很长的商品名称'.repeat(12),
      date: '2026-09-01',
      image: '/api/images/a" onload="alert(1)',
    },
  ];
  const svg = renderCatalogSheet(data, '<图鉴>', 1, 2, true);
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;图鉴&gt;'));
  assert.ok(!svg.includes('" onload='));
  assert.ok(svg.includes('preserveAspectRatio="xMidYMid meet"'));
  assert.ok(svg.includes('2026-09-01'));
  assert.ok(svg.includes('…'));
  assert.ok(!renderCatalogSheet(data, '图鉴', 1, 1, false).includes('2026-09-01'));
  assert.ok(renderCatalogSheet([{ name: '没有图片' }], '图鉴', 1, 1, false).includes('暂无图片'));
});
