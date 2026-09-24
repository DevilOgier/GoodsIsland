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

test('密集请柬的字段标签与数值有独立行距，数量和心理价保留', () => {
  for (const ratio of Object.keys(ratios)) {
    for (const count of [4, 6, 8, 10, 12]) {
      const items = Array.from({ length: count }, (_, i) => ({
        productId: String(i),
        name: '三角初华 · Wego主唱系列 · 徽章',
        quantity: 100,
        price: '35',
        note: '备注',
      }));
      const svg = renderPoster({
        title: '收物',
        type: 'WANTED',
        template: 'invitation',
        ratio,
        items,
      });
      const texts = [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
        value: m[2],
        y: Number(m[1].match(/\by="([^"]+)"/)?.[1]),
        size: Number(m[1].match(/font-size="([^"]+)"/)?.[1]),
      }));
      for (let i = 0; i < texts.length; i++) {
        if (texts[i].value !== 'QUANTITY' && texts[i].value !== '心理价 / BUDGET') continue;
        const label = texts[i],
          value = texts[i + 1];
        assert.ok(
          value.y - value.size > label.y + label.size * 0.25,
          ratio + ' / ' + count + '：字段标签不可与数值重叠',
        );
      }
      assert.equal(texts.filter((t) => t.value === '100' || t.value === '×100').length, count);
      assert.equal(
        texts.filter((t) => t.value === '¥35' || t.value === '心理价 ¥35').length,
        count,
      );
    }
  }
});
