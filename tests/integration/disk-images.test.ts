import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { db } from '../../src/infrastructure/db';
import { createUpload, completeUpload } from '../../src/domain/image-service';
import { putObject, readObject } from '../../src/infrastructure/storage';
import { createCatalogFixture, deleteCatalogFixture } from './catalog-fixture';
test('磁盘图片流程：上传凭证、原图、缩略图与数据库关联', async () => {
  const root = await mkdtemp(join(tmpdir(), 'guzi-image-'));
  const oldDriver = process.env.STORAGE_DRIVER,
    oldRoot = process.env.STORAGE_LOCAL_DIR;
  process.env.STORAGE_DRIVER = 'filesystem';
  process.env.STORAGE_LOCAL_DIR = root;
  const user = await db.user.create({
    data: {
      email: randomUUID() + '@example.invalid',
      name: '磁盘测试',
      passwordHash: 'disabled',
      role: 'ADMIN',
    },
  });
  const catalog = await createCatalogFixture(db, '图片测试');
  const series = catalog.series;
  const product = await db.product.create({
    data: { seriesId: series.id, name: '磁盘图片测试', productType: 'BADGE' },
  });
  try {
    const intent = await createUpload(user.id, product.id, 'image/png');
    assert.equal(intent.url, '/api/images/upload/' + intent.id);
    const pending = await db.uploadIntent.findUniqueOrThrow({ where: { id: intent.id } });
    const bytes = await sharp({
      create: { width: 32, height: 32, channels: 4, background: '#abcdef' },
    })
      .png()
      .toBuffer();
    await putObject(pending.objectKey, bytes, 'image/png');
    await completeUpload(user.id, intent.id);
    await completeUpload(user.id, intent.id);
    const saved = await db.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { original: true, thumbnail: true },
    });
    assert.ok(saved.original);
    assert.ok(saved.thumbnail);
    assert.deepEqual(await readObject(saved.original.objectKey), bytes);
    assert.equal(
      (await sharp(await readObject(saved.thumbnail.objectKey)).metadata()).format,
      'webp',
    );
  } finally {
    await db.uploadIntent.deleteMany({ where: { userId: user.id } });
    await db.product.delete({ where: { id: product.id } });
    await db.imageAsset.deleteMany({ where: { userId: user.id } });
    await deleteCatalogFixture(db, catalog);
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
    if (oldDriver === undefined) delete process.env.STORAGE_DRIVER;
    else process.env.STORAGE_DRIVER = oldDriver;
    if (oldRoot === undefined) delete process.env.STORAGE_LOCAL_DIR;
    else process.env.STORAGE_LOCAL_DIR = oldRoot;
    await rm(root, { recursive: true, force: true });
  }
});
