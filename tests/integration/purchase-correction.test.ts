import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';

test('修改与删除买入记录会重算库存、出库成本和补费', async () => {
  const user = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '买入修正测试',
      passwordHash: 'disabled',
      role: 'USER',
    },
  });
  const catalog = await createCatalogFixture(db, '买入修正');
  const product = await db.product.create({
    data: {
      seriesId: catalog.series.id,
      name: '买入修正商品 ' + randomUUID(),
      productType: 'BADGE',
    },
  });
  const send = (operation: string, data: unknown) =>
    command(user, operation, data, randomUUID()) as Promise<Record<string, unknown>>;
  const purchaseInput = (overrides: Record<string, unknown> = {}) => ({
    productId: product.id,
    quantity: 3,
    unitPrice: '10',
    domesticShipping: '0',
    internationalShipping: '0',
    otherFee: '0',
    purchaseChannel: '测试',
    purchaseDate: '2026-09-10',
    arrivalStatus: 'ARRIVED',
    notes: '',
    ...overrides,
  });
  try {
    const first = await send('purchase.create', purchaseInput());
    const sale = await send('sale.create', {
      productId: product.id,
      quantity: 1,
      unitPrice: '20',
      saleChannel: '测试',
      saleDate: '2026-09-10',
      notes: '',
    });
    await send('purchase.update', purchaseInput({ id: first.id, quantity: 4, unitPrice: '12' }));
    let inventory = await db.inventory.findUniqueOrThrow({
      where: { userId_productId: { userId: user.id, productId: product.id } },
    });
    assert.equal(inventory.currentQuantity, 3);
    assert.equal(inventory.currentCost.toFixed(2), '36.00');
    assert.equal(
      (
        await db.sale.findUniqueOrThrow({ where: { id: sale.id as string } })
      ).allocatedActualCost.toFixed(2),
      '12.00',
    );

    const second = await send(
      'purchase.create',
      purchaseInput({ quantity: 2, unitPrice: '20', purchaseDate: '2026-09-11' }),
    );
    await send('purchase.fees', {
      purchaseId: second.id,
      domesticShipping: '5',
      internationalShipping: '0',
      otherFee: '0',
      reason: '测试补费',
    });
    await send('purchase.delete', { id: second.id });
    inventory = await db.inventory.findUniqueOrThrow({ where: { id: inventory.id } });
    assert.equal(inventory.currentQuantity, 3);
    assert.equal(inventory.currentCost.toFixed(2), '36.00');
    assert.equal(await db.feeAdjustment.count({ where: { purchaseId: second.id as string } }), 0);

    await assert.rejects(send('purchase.delete', { id: first.id }), /历史出库时库存不足/);
    assert.equal(await db.purchase.count({ where: { id: first.id as string } }), 1);
    assert.equal(
      (await db.inventory.findUniqueOrThrow({ where: { id: inventory.id } })).currentQuantity,
      3,
    );
  } finally {
    const inventory = await db.inventory.findFirst({ where: { userId: user.id } });
    if (inventory) {
      await db.saleCostAdjustment.deleteMany({ where: { sale: { userId: user.id } } });
      await db.costRevision.deleteMany({ where: { inventoryId: inventory.id } });
      await db.inventoryEvent.deleteMany({ where: { inventoryId: inventory.id } });
      await db.saleListing.deleteMany({ where: { inventoryId: inventory.id } });
    }
    await db.feeAdjustment.deleteMany({ where: { purchase: { userId: user.id } } });
    await db.sale.deleteMany({ where: { userId: user.id } });
    await db.purchase.deleteMany({ where: { userId: user.id } });
    await db.inventory.deleteMany({ where: { userId: user.id } });
    await db.mutationRequest.deleteMany({ where: { userId: user.id } });
    await db.product.delete({ where: { id: product.id } });
    await deleteCatalogFixture(db, catalog);
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
