import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';
test('拼团购入：原子建团、已有团、已有团项、权限、回滚和幂等', async () => {
  const user = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '拼团测试',
      passwordHash: 'disabled',
      role: 'ADMIN',
    },
  });
  const catalog = await createCatalogFixture(db, '拼团测试');
  const series = catalog.series;
  const product = await db.product.create({
    data: { seriesId: series.id, name: '拼团测试商品', productType: 'BADGE' },
  });
  const send = (data: unknown, key = randomUUID()) =>
    command(user, 'purchase.create', data, key) as Promise<{
      id: string;
      groupBuyId: string;
      groupBuyItemId: string;
    }>;
  const base = {
    productId: product.id,
    quantity: 2,
    unitPrice: '12',
    purchaseChannel: '拼团',
    purchaseDate: '2026-09-09',
    arrivalStatus: 'ARRIVED',
  };
  try {
    await assert.rejects(send(base), /请选择已有拼团/);
    const key = randomUUID(),
      input = { ...base, newGroup: { name: '购入时建团', groupOwner: '团长' } };
    const first = await send(input, key);
    const again = await send(input, key);
    assert.equal(first.id, again.id);
    assert.equal(await db.groupBuy.count({ where: { userId: user.id } }), 1);
    assert.equal(
      (await db.inventory.findFirstOrThrow({ where: { userId: user.id } })).currentQuantity,
      2,
    );
    assert.equal(
      (await db.groupBuyItem.findUniqueOrThrow({ where: { id: first.groupBuyItemId } }))
        .paymentStatus,
      'PAID',
    );
    const second = await send({ ...base, groupId: first.groupBuyId, arrivalStatus: 'PENDING' });
    assert.equal(second.groupBuyId, first.groupBuyId);
    assert.notEqual(second.groupBuyItemId, first.groupBuyItemId);
    assert.equal(
      (await db.groupBuyItem.findUniqueOrThrow({ where: { id: second.groupBuyItemId } }))
        .paymentStatus,
      'PAID',
    );
    const item = (await command(
      user,
      'group.item',
      { groupId: first.groupBuyId, productId: product.id, quantity: 2, unitPrice: '12' },
      randomUUID(),
    )) as { id: string };
    assert.equal(
      (await db.groupBuyItem.findUniqueOrThrow({ where: { id: item.id } })).paymentStatus,
      'UNPAID',
    );
    const linked = (await command(user, 'group.pay', { id: item.id }, randomUUID())) as {
      id: string;
    };
    const paid = await db.groupBuyItem.findUniqueOrThrow({
      where: { id: item.id },
      include: { purchase: true },
    });
    assert.equal(paid.paymentStatus, 'PAID');
    assert.equal(paid.purchase?.arrivalStatus, 'PENDING');
    await command(user, 'group.dispatch', { id: item.id, shippingFee: '5.50' }, randomUUID());
    const dispatched = await db.groupBuyItem.findUniqueOrThrow({
      where: { id: item.id },
      include: { purchase: true },
    });
    assert.equal(dispatched.dispatchStatus, 'DISPATCHED');
    assert.equal(dispatched.purchase?.arrivalStatus, 'SHIPPED');
    assert.equal(dispatched.purchase?.actualCost.toFixed(2), '29.50');
    await command(user, 'purchase.arrive', { id: linked.id }, randomUUID());
    assert.equal(
      (await db.inventory.findFirstOrThrow({ where: { userId: user.id } })).currentQuantity,
      4,
    );
    await assert.rejects(
      command(user, 'group.dispatch', { id: item.id, shippingFee: '0' }, randomUUID()),
      /已经派发/,
    );
    await command(user, 'purchase.delete', { id: linked.id }, randomUUID());
    assert.equal(await db.groupBuyItem.count({ where: { id: item.id } }), 0);
    assert.equal(await db.purchase.count({ where: { id: linked.id } }), 0);
    assert.equal(
      (await db.inventory.findFirstOrThrow({ where: { userId: user.id } })).currentQuantity,
      2,
    );
    await assert.rejects(
      send({ ...base, groupId: first.groupBuyId, newGroup: { name: '多余', groupOwner: '团长' } }),
      /一种/,
    );
    await assert.rejects(send({ ...base, groupId: randomUUID() }), /不存在/);
    await assert.rejects(
      send({ ...base, newGroup: { name: '应当回滚', groupOwner: '团长' }, wantedId: randomUUID() }),
      /收物目标无效/,
    );
    assert.equal(await db.groupBuy.count({ where: { userId: user.id } }), 1);
    await db.groupBuy.update({ where: { id: first.groupBuyId }, data: { status: 'CLOSED' } });
    await assert.rejects(send({ ...base, groupId: first.groupBuyId }), /截团/);
  } finally {
    await db.inventoryEvent.deleteMany({ where: { inventory: { userId: user.id } } });
    await db.purchase.deleteMany({ where: { userId: user.id } });
    await db.groupBuyItem.deleteMany({ where: { group: { userId: user.id } } });
    await db.groupBuy.deleteMany({ where: { userId: user.id } });
    await db.inventory.deleteMany({ where: { userId: user.id } });
    await db.mutationRequest.deleteMany({ where: { userId: user.id } });
    await db.product.delete({ where: { id: product.id } });
    await deleteCatalogFixture(db, catalog);
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
