import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';
let user: { id: string; role: string };
let productId: string;
let catalog: Awaited<ReturnType<typeof createCatalogFixture>>;
const send = (op: string, data: unknown, key = randomUUID()) =>
  command(user, op, data, key) as Promise<Record<string, unknown>>;
before(async () => {
  user = await db.user.create({
    data: {
      email: 'test-' + randomUUID() + '@example.invalid',
      name: '自动化测试',
      passwordHash: 'disabled',
      role: 'ADMIN',
    },
  });
  catalog = await createCatalogFixture(db, '库存测试');
  const s = catalog.series;
  const p = await db.product.create({
    data: { seriesId: s.id, name: '测试商品 ' + randomUUID(), productType: 'BADGE' },
  });
  productId = p.id;
});
after(async () => {
  const inv = await db.inventory.findMany({ where: { userId: user.id } });
  const ids = inv.map((i) => i.id);
  await db.saleCostAdjustment.deleteMany({ where: { sale: { userId: user.id } } });
  await db.costRevision.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.feeAdjustment.deleteMany({ where: { purchase: { userId: user.id } } });
  await db.inventoryEvent.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.sale.deleteMany({ where: { userId: user.id } });
  await db.saleListing.deleteMany({ where: { inventoryId: { in: ids } } });
  await db.purchase.deleteMany({ where: { userId: user.id } });
  await db.inventory.deleteMany({ where: { userId: user.id } });
  await db.mutationRequest.deleteMany({ where: { userId: user.id } });
  await db.product.delete({ where: { id: productId } });
  await deleteCatalogFixture(db, catalog);
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
});
test('真实PostgreSQL：到货、挂出、成交、补费、幂等、回滚、并发', async () => {
  const p = await send('purchase.create', {
    productId,
    quantity: 3,
    unitPrice: '10',
    purchaseChannel: '测试',
    purchaseDate: '2026-09-08',
    arrivalStatus: 'PENDING',
  });
  assert.equal(await db.inventory.count({ where: { userId: user.id } }), 0);
  await send('purchase.arrive', { id: p.id });
  await send('purchase.arrive', { id: p.id });
  let inv = await db.inventory.findFirstOrThrow({ where: { userId: user.id } });
  assert.equal(inv.currentQuantity, 3);
  assert.equal(await db.inventoryEvent.count({ where: { inventoryId: inv.id, type: 'BUY' } }), 1);
  const listing = await send('listing.create', { productId, quantity: 2, unitPrice: '15' });
  inv = await db.inventory.findUniqueOrThrow({ where: { id: inv.id } });
  assert.equal(inv.currentQuantity, 3);
  const sale = await send('sale.create', {
    productId,
    listingId: listing.id,
    quantity: 1,
    unitPrice: '15',
    saleChannel: '测试',
    saleDate: '2026-09-08',
  });
  assert.equal(
    (await db.saleListing.findUniqueOrThrow({ where: { id: listing.id as string } }))
      .remainingQuantity,
    1,
  );
  const key = randomUUID();
  const feeData = { purchaseId: p.id, internationalShipping: '6', reason: '晚补国际运费' };
  await send('purchase.fees', feeData, key);
  await send('purchase.fees', feeData, key);
  inv = await db.inventory.findUniqueOrThrow({ where: { id: inv.id } });
  assert.equal(inv.currentQuantity, 2);
  assert.equal(inv.currentCost.toFixed(2), '24.00');
  const cost = await db.saleCostAdjustment.findFirstOrThrow({
    where: { saleId: sale.id as string },
  });
  assert.equal(cost.amount.toFixed(2), '2.00');
  await assert.rejects(
    send('purchase.fees', { ...feeData, internationalShipping: '7' }, key),
    /幂等/,
  );
  const before = await db.sale.count({ where: { userId: user.id } });
  await assert.rejects(
    send('sale.create', {
      productId,
      quantity: 3,
      unitPrice: '20',
      saleChannel: '测试',
      saleDate: '2026-09-08',
    }),
    /库存不足/,
  );
  assert.equal(await db.sale.count({ where: { userId: user.id } }), before);
  await send('listing.cancel', { id: listing.id });
  const results = await Promise.allSettled([
    send('sale.create', {
      productId,
      quantity: 2,
      unitPrice: '20',
      saleChannel: '测试',
      saleDate: '2026-09-08',
    }),
    send('sale.create', {
      productId,
      quantity: 2,
      unitPrice: '20',
      saleChannel: '测试',
      saleDate: '2026-09-08',
    }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  await send('purchase.fees', { purchaseId: p.id, domesticShipping: '3', reason: '售罄后补费' });
  inv = await db.inventory.findUniqueOrThrow({ where: { id: inv.id } });
  assert.equal(inv.currentQuantity, 0);
  assert.equal(inv.currentCost.toFixed(2), '0.00');
  const ledger = await db.inventoryEvent.aggregate({
    where: { inventoryId: inv.id },
    _sum: { quantityDelta: true, costDelta: true },
  });
  assert.equal(ledger._sum.quantityDelta, 0);
  assert.equal(ledger._sum.costDelta!.toFixed(2), '0.00');
  const allSales = await db.sale.findMany({
    where: { userId: user.id },
    include: { costAdjustments: true },
  });
  assert.equal(
    allSales.reduce(
      (n, s) =>
        n +
        Number(s.allocatedActualCost) +
        s.costAdjustments.reduce((m, a) => m + Number(a.amount), 0),
      0,
    ),
    39,
  );
  const other = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '隔离测试',
      passwordHash: 'disabled',
      role: 'USER',
    },
  });
  await assert.rejects(command(other, 'purchase.arrive', { id: p.id }, randomUUID()), /不存在/);
  await assert.rejects(
    command(other, 'catalog.entity', { type: 'ip', name: '不允许' }, randomUUID()),
    /管理员/,
  );
  await db.user.delete({ where: { id: other.id } });
});
