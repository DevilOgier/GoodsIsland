import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
test('拼团购入：原子建团、已有团、已有团项、权限、回滚和幂等', async () => {
  const user = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '拼团测试',
      passwordHash: 'disabled',
      role: 'ADMIN',
    },
  });
  const series = await db.series.findFirstOrThrow();
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
    const second = await send({ ...base, groupId: first.groupBuyId, arrivalStatus: 'PENDING' });
    assert.equal(second.groupBuyId, first.groupBuyId);
    assert.notEqual(second.groupBuyItemId, first.groupBuyItemId);
    const item = await db.groupBuyItem.create({
      data: { groupId: first.groupBuyId, productId: product.id, quantity: 2, unitPrice: '12' },
    });
    await assert.rejects(send({ ...base, groupBuyItemId: item.id, quantity: 3 }), /数量/);
    await send({ ...base, groupBuyItemId: item.id });
    await assert.rejects(send({ ...base, groupBuyItemId: item.id }), /已关联/);
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
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
