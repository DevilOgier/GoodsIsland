import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../src/infrastructure/db';
import { command } from '../../src/domain/commands';
import { snapshot } from '../../src/domain/query-service';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';

test('商品发布日期必填、支持补录、校验并统一倒序排列', async () => {
  const user = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '发售日期测试',
      passwordHash: 'disabled',
      role: 'ADMIN',
    },
  });
  const fixture = await createCatalogFixture(db, '发售日期测试');
  const productType = await db.productType.findFirstOrThrow({ where: { status: 'ACTIVE' } });
  const productIds: string[] = [];
  const base = {
    seriesId: fixture.series.id,
    productType: productType.key,
    appearanceKey: 'default',
    description: '',
    tagIds: [],
  };
  try {
    await assert.rejects(command(user, 'catalog.product', base, randomUUID()), /发售日期/);

    const withoutDate = await db.product.create({
      data: {
        seriesId: fixture.series.id,
        productType: productType.key,
        name: fixture.character.name + ' · ' + fixture.series.name + ' · 旧商品',
        appearanceKey: 'legacy-without-date',
      },
    });
    productIds.push(withoutDate.id);
    assert.equal(withoutDate.releaseDate, null);

    const older = await command(
      user,
      'catalog.product',
      { ...base, appearanceKey: 'older', releaseDate: '2025-03-08' },
      randomUUID(),
    ) as { id: string; releaseDate: string };
    productIds.push(older.id);
    assert.equal(new Date(older.releaseDate).toISOString(), '2025-03-08T00:00:00.000Z');

    const newer = await command(
      user,
      'catalog.product',
      { ...base, appearanceKey: 'newer', releaseDate: '2026-07-12' },
      randomUUID(),
    ) as { id: string; releaseDate: string };
    productIds.push(newer.id);

    const updated = await command(
      user,
      'catalog.product-update',
      { ...base, appearanceKey: 'older', id: older.id, releaseDate: '2025-04-09' },
      randomUUID(),
    ) as { releaseDate: string };
    assert.equal(new Date(updated.releaseDate).toISOString(), '2025-04-09T00:00:00.000Z');

    const filled = await command(
      user,
      'catalog.product-update',
      { ...base, appearanceKey: 'legacy-without-date', id: withoutDate.id, releaseDate: '2024-01-02' },
      randomUUID(),
    ) as { releaseDate: string };
    assert.equal(new Date(filled.releaseDate).toISOString(), '2024-01-02T00:00:00.000Z');

    await assert.rejects(
      command(
        user,
        'catalog.product-update',
        { ...base, appearanceKey: 'older', id: older.id, releaseDate: '' },
        randomUUID(),
      ),
      /发售日期/,
    );

    await assert.rejects(
      command(
        user,
        'catalog.product-update',
        { ...base, id: withoutDate.id, releaseDate: '2026-02-30' },
        randomUUID(),
      ),
    );

    const data = await snapshot(user.id);
    const bySeries = data.products.filter((product) => product.seriesId === fixture.series.id);
    assert.deepEqual(bySeries.map((product) => product.id), [newer.id, older.id, withoutDate.id]);
    const byCharacter = data.products.filter(
      (product) => product.series.characterId === fixture.character.id,
    );
    assert.deepEqual(byCharacter.map((product) => product.id), [newer.id, older.id, withoutDate.id]);
  } finally {
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    await db.mutationRequest.deleteMany({ where: { userId: user.id } });
    await deleteCatalogFixture(db, fixture);
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
