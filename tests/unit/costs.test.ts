import test from 'node:test';
import assert from 'node:assert/strict';
import { allocated, replayCosts } from '../../src/domain/money';
import { renderPoster } from '../../src/poster/renderer';
test('分币残差在最后一次出库消除', () => {
  const first = allocated('10', 1, 3);
  const second = allocated(10 - Number(first), 1, 2);
  const last = allocated(10 - Number(first) - Number(second), 1, 1);
  assert.equal(first.add(second).add(last).toFixed(2), '10.00');
});
test('晚补运费重放原顺序，影响已售与剩余库存', () => {
  const result = replayCosts([
    { id: 'a', quantity: 3, cost: '30', purchaseCost: '36' },
    { id: 'b', quantity: -1, cost: '-10', saleId: 'sale' },
  ]);
  assert.equal(result.cost, '24.00');
  assert.equal(result.outflows[0].cost, '12.00');
  assert.equal(result.quantity, 2);
});
test('多批次与完全售罄后晚补费用', () => {
  const r = replayCosts([
    { id: 'a', quantity: 3, cost: '30', purchaseCost: '36' },
    { id: 's1', quantity: -1, cost: '-10', saleId: 's1' },
    { id: 'b', quantity: 2, cost: '40', purchaseCost: '40' },
    { id: 's2', quantity: -4, cost: '-60', saleId: 's2' },
  ]);
  assert.equal(r.cost, '0.00');
  assert.equal(r.outflows[1].cost, '64.00');
});
test('不能超卖', () => assert.throws(() => allocated('20', 3, 2)));
test('海报稳定、转义、不改变数量价格', () => {
  const d = {
    title: '收 <喜欢>',
    type: 'WANTED' as const,
    template: 'cute',
    ratio: '1:1',
    items: [
      { productId: '1', name: '三月七 & 徽章', quantity: 3, price: '30.00', note: '<script>' },
    ],
  };
  assert.equal(renderPoster(d), renderPoster(d));
  assert.match(renderPoster(d), /× 3/);
  assert.match(renderPoster(d), /¥30.00/);
  assert.match(renderPoster(d), /&lt;script&gt;/);
  assert.doesNotMatch(renderPoster(d), /<script>/);
});
test('全部比例和模板都可渲染单件商品', () => {
  for (const ratio of ['1:1', '4:3', '3:4', '16:9', '9:16'])
    for (const template of ['cute', 'simple', 'retro', 'minimal'])
      assert.match(
        renderPoster({
          title: '收藏',
          type: 'SALE',
          ratio,
          template,
          items: [{ productId: '1', name: '三月七徽章', quantity: 1, price: '1.00', note: '' }],
        }),
        /<svg/,
      );
});
