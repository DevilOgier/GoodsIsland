import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshotIndex } from '../../src/lib/snapshot-index';
import type { Snapshot } from '../../src/components/types';

test('Snapshot 索引按商品聚合买入、卖出、心愿与状态数量', () => {
  const product = { id: 'product' };
  const data = {
    products: [product],
    characters: [{ id: 'character' }],
    series: [{ id: 'series' }],
    inventory: [{ id: 'inventory', productId: 'product' }],
    purchases: [
      { id: 'pending', productId: 'product', quantity: 2, arrivalStatus: 'PENDING' },
      { id: 'transit', productId: 'product', quantity: 3, arrivalStatus: 'SHIPPED' },
      { id: 'arrived', productId: 'product', quantity: 4, arrivalStatus: 'ARRIVED' },
    ],
    sales: [{ id: 'sale', productId: 'product' }],
    wanted: [{ id: 'wanted', productId: 'product' }],
    listings: [
      {
        id: 'active',
        status: 'ACTIVE',
        remainingQuantity: 2,
        inventory: { productId: 'product' },
      },
      {
        id: 'done',
        status: 'COMPLETED',
        remainingQuantity: 9,
        inventory: { productId: 'product' },
      },
    ],
  } as unknown as Snapshot;

  const index = buildSnapshotIndex(data);
  assert.equal(index.productById.get('product'), product);
  assert.equal(index.purchasesByProductId.get('product')?.length, 3);
  assert.equal(index.salesByProductId.get('product')?.length, 1);
  assert.equal(index.wantedByProductId.get('product')?.length, 1);
  assert.equal(index.pendingQuantity('product'), 2);
  assert.equal(index.transitQuantity('product'), 3);
  assert.equal(index.awaitingArrivalQuantity('product'), 5);
  assert.equal(index.activeListingQuantity('product'), 2);
  assert.equal(index.awaitingArrivalQuantity('missing'), 0);
});
