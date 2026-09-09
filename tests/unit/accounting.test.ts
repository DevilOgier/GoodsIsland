import test from 'node:test';
import assert from 'node:assert/strict';
import { accounting, cents, fixed } from '../../src/domain/accounting';
import type { Snapshot } from '../../src/components/types';
const product = (id: string, seriesId: string, characterId: string) => ({
  id,
  seriesId,
  productType: 'BADGE',
  series: { name: seriesId, characterId, character: { name: characterId, ipId: 'ip' } },
});
const purchase = (id: string, productId: string, status: string, adjustments: unknown[] = []) => ({
  id,
  productId,
  arrivalStatus: status,
  quantity: 2,
  productAmount: '20',
  unitPrice: '10',
  domesticShipping: '2',
  internationalShipping: '0',
  otherFee: '0',
  actualCost: adjustments.length ? '28' : '22',
  purchaseDate: '2026-08-15T00:00:00.000Z',
  purchaseChannel: '测试',
  notes: '',
  adjustments,
});
const data = {
  products: [product('p', 's', 'c'), product('p2', 's2', 'c2')],
  purchases: [
    purchase('a', 'p', 'ARRIVED', [
      { id: 'fee', createdAt: '2026-08-31T16:30:00.000Z', amount: '6', reason: '运费' },
    ]),
    purchase('b', 'p', 'PENDING'),
    purchase('cancel', 'p', 'CANCELLED'),
    purchase('other', 'p2', 'ARRIVED'),
  ],
  sales: [
    {
      id: 'sale',
      productId: 'p',
      quantity: 1,
      totalAmount: '18',
      allocatedActualCost: '11',
      saleDate: '2026-09-02T00:00:00.000Z',
      saleChannel: '测试',
      notes: '',
      costAdjustments: [{ amount: '3' }],
    },
  ],
  inventory: [
    { productId: 'p', currentQuantity: 1, currentCost: '14' },
    { productId: 'p2', currentQuantity: 2, currentCost: '22' },
  ],
} as unknown as Snapshot;
test('账本：按月份计入补费，累计资产不跟随月份，排除取消，角色系列筛选', () => {
  const a = accounting(data, { month: '2026-09', character: 'c' });
  assert.equal(a.income, 1800n);
  assert.equal(a.expense, 600n);
  assert.equal(a.net, 1200n);
  assert.equal(a.currentCost, 1400n);
  assert.equal(a.pendingCost, 2200n);
  assert.equal(a.arrivedCost, 2800n);
  assert.equal(a.totalSpent, 5000n);
  assert.equal(a.bought, 4);
  assert.equal(a.sold, 1);
  assert.equal(a.profit, 400n);
  assert.equal(a.breakdown.length, 1);
  assert.equal(a.breakdown[0].spent, 5000n);
  assert.equal(accounting(data, { month: '2026-08', series: 's' }).expense, 4400n);
  assert.equal(accounting(data, { month: '2026-09', character: 'c', status: 'SOLD' }).expense, 0n);
  assert.equal(accounting(data, { month: '2026-01', character: 'c' }).currentCost, 1400n);
  assert.equal(accounting(data, { character: 'missing' }).rows.length, 0);
});
test('账本金额使用整数分，支持大数和负净收入', () => {
  assert.equal(fixed(cents('9999999999999999.99') + 1n), '10000000000000000.00');
  assert.equal(fixed(-1n), '-0.01');
  assert.equal(cents('0.1'), 10n);
});
