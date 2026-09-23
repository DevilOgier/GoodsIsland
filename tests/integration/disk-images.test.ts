import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { posterImage } from '../../src/infrastructure/poster-image';
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
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 171, g: 205, b: 239, alpha: 0.5 },
      },
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
    const variant = await posterImage(saved.original.objectKey, 256);
    const variantMeta = await sharp(variant).metadata();
    assert.equal(variantMeta.format, 'webp');
    assert.equal(variantMeta.width, 32, 'small originals must not be enlarged');
    assert.equal(variantMeta.hasAlpha, true);
    assert.strictEqual(await posterImage(saved.original.objectKey, 256), variant);
    const largeKey = `original/${randomUUID()}`;
    const large = await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 4,
        background: { r: 171, g: 205, b: 239, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    await putObject(largeKey, large, 'image/png');
    const resized = await sharp(await posterImage(largeKey, 512)).metadata();
    assert.equal(resized.width, 512);
    assert.equal(resized.height, 256);
    assert.deepEqual(await readObject(largeKey), large, 'original remains unchanged');

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
