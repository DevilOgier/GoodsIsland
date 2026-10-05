import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { db } from '../../src/infrastructure/db';
import {
  requestCatalog,
  generateCatalog,
  catalogStatus,
  catalogNeedsRefresh,
} from '../../src/domain/catalog-export-service';
import {
  catalogCycle,
  readCatalogRecord,
  acquireCatalogLease,
  type CatalogResult,
} from '../../src/infrastructure/catalog-export-store';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';

test('长图后台缓存：请求不渲染、复用成品、变化重建、失败保留旧图、03时更新与租约', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'goods-catalog-test-'));
  const old = {
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR,
    CATALOG_EXPORT_DIR: process.env.CATALOG_EXPORT_DIR,
  };
  process.env.STORAGE_DRIVER = 'filesystem';
  process.env.STORAGE_LOCAL_DIR = dir;
  process.env.CATALOG_EXPORT_DIR = join(dir, 'jobs');
  const fixture = await createCatalogFixture(db, '长图缓存测试');
  const type = await db.productType.findFirstOrThrow();
  let id = '';
  try {
    const product = await db.product.create({
      data: {
        name: '长图测试徽章',
        seriesId: fixture.series.id,
        productType: type.key,
        releaseDate: new Date('2026-09-01'),
      },
    });
    id = product.id;
    const spec = {
      type: type.key,
      character: fixture.character.id,
      title: '测试图鉴',
      showDate: false,
      ids: [id],
    };
    const first = await requestCatalog(spec);
    assert.equal(first.status, 'queued');
    await assert.rejects(stat(join(dir, 'catalog', first.id)));
    await generateCatalog(first.id);
    assert.equal((await catalogStatus(first.id)).status, 'ready');
    const artifact = join(dir, 'catalog', first.id),
      a = await stat(artifact);
    const again = await requestCatalog(spec);
    assert.equal(again.id, first.id);
    assert.equal(again.status, 'ready');
    await generateCatalog(first.id);
    assert.equal((await stat(artifact)).mtimeMs, a.mtimeMs, 'unchanged data should not rerender');
    const record = await readCatalogRecord<CatalogResult>(first.id, 'result');
    assert.ok(record);
    await db.product.update({ where: { id }, data: { name: '修改后的徽章' } });
    await generateCatalog(first.id);
    const changed = await readCatalogRecord<CatalogResult>(first.id, 'result');
    assert.notEqual(changed?.fingerprint, record.fingerprint);
    await db.product.delete({ where: { id } });
    id = '';
    await generateCatalog(first.id);
    assert.equal(
      (await catalogStatus(first.id)).status,
      'ready',
      'failed refresh keeps last good image',
    );
    const failed = await readCatalogRecord<CatalogResult>(first.id, 'result');
    assert.ok(failed?.error);
    assert.equal(catalogNeedsRefresh(failed), false, 'failed jobs back off');
    assert.equal(catalogCycle(new Date('2026-10-05T18:59:59Z')), '2026-10-05');
    assert.equal(catalogCycle(new Date('2026-10-05T19:00:00Z')), '2026-10-06');
    assert.equal(
      catalogNeedsRefresh(
        { ...record, generatedAt: '2026-10-05T18:00:00Z' },
        new Date('2026-10-05T19:00:01Z'),
      ),
      true,
    );
    const release = await acquireCatalogLease();
    assert.ok(release);
    assert.equal(await acquireCatalogLease(), null);
    await release();
  } finally {
    if (id) await db.product.delete({ where: { id } });
    await deleteCatalogFixture(db, fixture);
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    assert.ok(dir.startsWith(join(tmpdir(), 'goods-catalog-test-')));
    await rm(dir, { recursive: true, force: true });
    await db.$disconnect();
  }
});
