import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPoster } from '../../src/poster/renderer';
import { renderPoster as legacy } from '../../src/poster/legacy-renderer';
import { posterPrefill } from '../../src/domain/poster-prefill';
import type { Snapshot } from '../../src/components/types';
test('四种模板具有不同结构而非只换色，旧模板保持原样', () => {
  const data = {
    title: '喜欢',
    type: 'WANTED' as const,
    ratio: '1:1',
    template: 'cute',
    items: [
      {
        productId: '1',
        name: '三月七 · 生日系列 · 徽章',
        quantity: 2,
        price: '28.00',
        note: '只收无伤',
      },
    ],
  };
  for (const [template, layout] of [
    ['cute', 'polaroid'],
    ['simple', 'gallery-hero'],
    ['retro', 'ticket'],
    ['minimal', 'editorial-row'],
  ])
    assert.match(renderPoster({ ...data, template }), new RegExp('data-layout="' + layout + '"'));
  assert.equal(renderPoster({ ...data, version: 1 }), legacy(data));
});
test('心愿只带入未收数量，出物只带入剩余挂出，不修改源数据', () => {
  const data = {
    products: [
      {
        id: 'p',
        name: '三月七 · 生日系列 · 徽章',
        originalId: 'original',
        enhancedId: 'enhanced',
        selectedSource: 'ORIGINAL',
      },
    ],
    wanted: [
      {
        id: 'w',
        productId: 'p',
        status: 'PARTIAL',
        wantedQuantity: 5,
        fulfilledQuantity: 2,
        targetPrice: '28.00',
        notes: '只收无伤',
      },
      {
        id: 'closed',
        productId: 'p',
        status: 'FULFILLED',
        wantedQuantity: 1,
        fulfilledQuantity: 1,
      },
    ],
    listings: [
      {
        id: 'l',
        inventory: { productId: 'p' },
        status: 'ACTIVE',
        remainingQuantity: 2,
        quantity: 4,
        unitPrice: '35.00',
        notes: '可合邮',
      },
    ],
  } as unknown as Snapshot;
  const before = JSON.stringify(data),
    wanted = posterPrefill(data, 'wanted'),
    sale = posterPrefill(data, 'listings', 'l');
  assert.equal(wanted.type, 'WANTED');
  assert.equal(wanted.items.length, 1);
  assert.equal(wanted.items[0].quantity, 3);
  assert.equal(wanted.items[0].price, '28.00');
  assert.equal(wanted.items[0].note, '只收无伤');
  assert.equal(wanted.assets.p, 'original');
  assert.equal(sale.type, 'SALE');
  assert.equal(sale.items[0].quantity, 2);
  assert.equal(sale.items[0].price, '35.00');
  assert.equal(sale.items[0].note, '可合邮');
  assert.equal(JSON.stringify(data), before);
});
