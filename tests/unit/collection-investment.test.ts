import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionInvestment } from '../../src/domain/collection-investment';
import type { Snapshot } from '../../src/components/types';

test('收藏投入包含待到货实付和补费，排除取消与已售成本，到货不重复计入', () => {
  const data = {
    inventory: [{ productId: 'a', currentCost: '12.30' }],
    purchases: [
      { productId: 'a', arrivalStatus: 'ARRIVED', actualCost: '24.60' },
      { productId: 'a', arrivalStatus: 'PENDING', actualCost: '20.10' },
      { productId: 'b', arrivalStatus: 'SHIPPED', actualCost: '35.55' },
      { productId: 'b', arrivalStatus: 'CANCELLED', actualCost: '100.00' },
    ],
  } as unknown as Snapshot;
  const before = collectionInvestment(data);
  assert.equal(before.inHand, 1230n);
  assert.equal(before.pending, 5565n);
  assert.equal(before.total, 6795n);
  assert.equal(before.pendingByProduct.get('b'), 3555n);
  data.purchases[1].arrivalStatus = 'ARRIVED';
  data.inventory[0].currentCost = '32.40';
  const after = collectionInvestment(data);
  assert.equal(after.total, before.total);
  assert.equal(after.pendingByProduct.has('a'), false);
  assert.equal(after.pending, 3555n);
});

test('仅有未到货商品也展示投入，空收藏金额为零', () => {
  const data = {
    inventory: [],
    purchases: [{ productId: 'a', arrivalStatus: 'PENDING', actualCost: '18.88' }],
  } as unknown as Snapshot;
  assert.equal(collectionInvestment(data).total, 1888n);
  assert.equal(collectionInvestment({ inventory: [], purchases: [] }).total, 0n);
});
