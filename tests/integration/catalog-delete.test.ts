import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';

test('图鉴删除：空层级可级联删除，业务数据会阻止误删', async () => {
  const admin = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '图鉴删除测试',
      passwordHash: 'disabled',
      role: 'ADMIN',
    },
  });
  const removable = await createCatalogFixture(db, '可删除');
  const protectedCatalog = await createCatalogFixture(db, '有业务记录');
  const removableProduct = await db.product.create({
    data: {
      seriesId: removable.series.id,
      name: '可删除商品 ' + randomUUID(),
      productType: 'BADGE',
    },
  });
  const protectedProduct = await db.product.create({
    data: {
      seriesId: protectedCatalog.series.id,
      name: '受保护商品 ' + randomUUID(),
      productType: 'BADGE',
    },
  });
  try {
    await command(admin, 'catalog.delete', { entity: 'ip', id: removable.ip.id }, randomUUID());
    assert.equal(await db.iP.count({ where: { id: removable.ip.id } }), 0);
    assert.equal(await db.product.count({ where: { id: removableProduct.id } }), 0);

    await command(
      admin,
      'purchase.create',
      {
        productId: protectedProduct.id,
        quantity: 1,
        unitPrice: '10',
        purchaseChannel: '测试',
        purchaseDate: '2026-09-09',
        arrivalStatus: 'PENDING',
      },
      randomUUID(),
    );
    await assert.rejects(
      command(admin, 'catalog.delete', { entity: 'ip', id: protectedCatalog.ip.id }, randomUUID()),
      /业务记录/,
    );
    assert.equal(await db.iP.count({ where: { id: protectedCatalog.ip.id } }), 1);

    const customType = (await command(
      admin,
      'catalog.type',
      { name: '可删除类型 ' + randomUUID().slice(0, 8) },
      randomUUID(),
    )) as { key: string };
    await command(
      admin,
      'catalog.delete',
      { entity: 'productType', id: customType.key },
      randomUUID(),
    );
    assert.equal(await db.productType.count({ where: { key: customType.key } }), 0);
    await assert.rejects(
      command(admin, 'catalog.delete', { entity: 'productType', id: 'BADGE' }, randomUUID()),
      /内置谷子类型/,
    );
  } finally {
    await db.purchase.deleteMany({ where: { userId: admin.id } });
    await db.mutationRequest.deleteMany({ where: { userId: admin.id } });
    await db.product.deleteMany({ where: { id: protectedProduct.id } });
    await deleteCatalogFixture(db, protectedCatalog);
    await db.user.delete({ where: { id: admin.id } });
    await db.$disconnect();
  }
});
