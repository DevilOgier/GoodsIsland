import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationPlacements } from '../../src/poster/templates/invitation-layout';
import { renderPoster, ratios, posterImageTargets } from '../../src/poster/renderer';

test('请柬所有比例与 1–12 件商品均在安全区内且条目不重叠', () => {
  for (const [width, height] of Object.values(ratios)) {
    for (let count = 1; count <= 12; count++) {
      const boxes = invitationPlacements(count, width, height);
      assert.equal(boxes.length, count);
      for (const [i, box] of boxes.entries()) {
        assert.ok(box.w > 0 && box.h > 0);
        assert.ok(box.x >= width * 0.15 && box.x + box.w <= width * 0.85 + 0.01);
        assert.ok(box.y >= height * 0.25 && box.y + box.h <= height * 0.9);
        for (const other of boxes.slice(i + 1)) {
          const overlapX = Math.min(box.x + box.w, other.x + other.w) - Math.max(box.x, other.x);
          const overlapY = Math.min(box.y + box.h, other.y + other.h) - Math.max(box.y, other.y);
          assert.ok(overlapX <= 0.01 || overlapY <= 0.01);
        }
      }
    }
  }
});

test('请柬双拱使用高清大图占位并保留收出物字段和转义', () => {
  const items = [0, 1].map((i) => ({
    productId: 'invitation-' + i,
    name: '长名称 & <限定收藏> '.repeat(8),
    quantity: 123456,
    price: '123456.78',
    note: '备注 & <script> '.repeat(20),
  }));
  const data = {
    title: '收藏 <心愿>',
    type: 'WANTED' as const,
    ratio: '4:3',
    template: 'invitation',
    items,
  };
  const output = renderPoster(data);
  assert.equal(output, renderPoster(data));
  assert.match(output, /COLLECTION INVITATION/);
  assert.match(output, /心理价/);
  assert.doesNotMatch(output, /<script>|NaN|Infinity/);
  assert.equal([...output.matchAll(/data-layout="invitation-entry"/g)].length, 2);
  for (const target of posterImageTargets(data).values()) {
    assert.ok(target.displayWidth > 400 && target.displayHeight > 400);
  }
  const hidden = renderPoster({ ...data, config: { priceStyle: 'PRICE_HIDDEN', showNote: false } });
  assert.doesNotMatch(hidden, /123456\.78|备注/);
});
