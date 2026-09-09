import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';
test('自定义类型和服务端自动命名', async () => {
  const user = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '图鉴测试',
      passwordHash: 'disabled',
      role: 'ADMIN',
    },
  });
  let typeKey: string | undefined;
  let productId: string | undefined;
  const catalog = await createCatalogFixture(db, '图鉴测试');
  try {
    const series = await db.series.findUniqueOrThrow({
      where: { id: catalog.series.id },
      include: { character: true },
    });
    const t = (await command(
      user,
      'catalog.type',
      { name: '测试色纸' + randomUUID().slice(0, 8) },
      randomUUID(),
    )) as { key: string; name: string };
    typeKey = t.key;
    const p = (await command(
      user,
      'catalog.product',
      { seriesId: series.id, productType: t.key, name: '伪造商品名' },
      randomUUID(),
    )) as { id: string; name: string };
    productId = p.id;
    assert.equal(p.name, series.character.name + ' · ' + series.name + ' · ' + t.name);
    const edited = (await command(
      user,
      'catalog.product-update',
      { id: p.id, seriesId: series.id, productType: t.key, name: '仍然不能覆盖' },
      randomUUID(),
    )) as { name: string };
    assert.equal(edited.name, p.name);
    await assert.rejects(
      command(
        user,
        'catalog.product',
        { seriesId: series.id, productType: 'NOT_A_TYPE' },
        randomUUID(),
      ),
      /有效系列与类型/,
    );
  } finally {
    if (productId) await db.product.delete({ where: { id: productId } });
    if (typeKey) await db.productType.delete({ where: { key: typeKey } });
    await deleteCatalogFixture(db, catalog);
    await db.mutationRequest.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
