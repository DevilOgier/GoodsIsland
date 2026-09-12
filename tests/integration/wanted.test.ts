import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';

test('收物心愿：同商品叠加数量、允许修改并支持删除', async () => {
  const user = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '心愿测试',
      passwordHash: 'disabled',
      role: 'USER',
    },
  });
  const other = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '其他用户',
      passwordHash: 'disabled',
      role: 'USER',
    },
  });
  const catalog = await createCatalogFixture(db, '心愿测试');
  const product = await db.product.create({
    data: { seriesId: catalog.series.id, name: '心愿测试商品', productType: 'BADGE' },
  });
  const create = (wantedQuantity: number, targetPrice: string) =>
    command(
      user,
      'wanted.create',
      {
        productId: product.id,
        wantedQuantity,
        targetPrice,
        priority: 'NORMAL',
        notes: '慢慢收',
      },
      randomUUID(),
    ) as Promise<{ id: string }>;

  try {
    const first = await create(2, '10');
    const second = await create(3, '12');
    assert.equal(second.id, first.id);
    const stacked = await db.wanted.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(stacked.wantedQuantity, 5);
    assert.equal(stacked.targetPrice?.toFixed(2), '12.00');

    await command(user, 'wanted.progress', { id: first.id, fulfilledQuantity: 2 }, randomUUID());
    await assert.rejects(
      command(
        user,
        'wanted.update',
        {
          id: first.id,
          productId: product.id,
          wantedQuantity: 1,
          targetPrice: '15',
          priority: 'HIGH',
          notes: '优先收',
        },
        randomUUID(),
      ),
      /不能少于已收数量/,
    );
    await command(
      user,
      'wanted.update',
      {
        id: first.id,
        productId: product.id,
        wantedQuantity: 6,
        targetPrice: '15',
        priority: 'HIGH',
        notes: '优先收',
      },
      randomUUID(),
    );
    const updated = await db.wanted.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(updated.status, 'PARTIAL');
    assert.equal(updated.priority, 'HIGH');
    assert.equal(updated.notes, '优先收');

    await assert.rejects(command(other, 'wanted.delete', { id: first.id }, randomUUID()), /不存在/);
    await command(user, 'wanted.delete', { id: first.id }, randomUUID());
    assert.equal(await db.wanted.count({ where: { id: first.id } }), 0);
  } finally {
    await db.wanted.deleteMany({ where: { userId: { in: [user.id, other.id] } } });
    await db.mutationRequest.deleteMany({ where: { userId: { in: [user.id, other.id] } } });
    await db.product.deleteMany({ where: { id: product.id } });
    await deleteCatalogFixture(db, catalog);
    await db.user.deleteMany({ where: { id: { in: [user.id, other.id] } } });
  }
});
