import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
import { db } from '@/infrastructure/db';
import { readObject, putObject, uploadUrl } from '@/infrastructure/storage';
import { ensure } from './errors';
export async function saveAsset(
  userId: string,
  kind: string,
  bytes: Buffer,
  sourceId?: string,
  isMock = false,
) {
  const meta = await sharp(bytes, { limitInputPixels: 24000000 }).metadata();
  ensure(meta.width && meta.height, '图片无效');
  const mime =
    meta.format === 'jpeg' ? 'image/jpeg' : meta.format === 'webp' ? 'image/webp' : 'image/png';
  const objectKey = kind.toLowerCase() + '/' + randomUUID();
  await putObject(objectKey, bytes, mime);
  return db.imageAsset.create({
    data: {
      userId,
      kind,
      objectKey,
      mimeType: mime,
      width: meta.width,
      height: meta.height,
      bytes: bytes.length,
      checksum: createHash('sha256').update(bytes).digest('hex'),
      sourceId,
      isMock,
    },
  });
}
export async function createUpload(userId: string, productId: string, mime: string) {
  ensure(['image/png', 'image/jpeg', 'image/webp'].includes(mime), '支持 PNG、JPG、WebP');
  ensure(await db.product.findUnique({ where: { id: productId } }), '商品不存在');
  const objectKey = 'original/' + randomUUID();
  const intent = await db.uploadIntent.create({
    data: {
      userId,
      productId,
      objectKey,
      mimeType: mime,
      expiresAt: new Date(Date.now() + 300000),
    },
  });
  return {
    id: intent.id,
    url:
      process.env.LOCAL_SERVICES === 'true' || process.env.STORAGE_DRIVER === 'filesystem'
        ? '/api/images/upload/' + intent.id
        : await uploadUrl(objectKey, mime),
  };
}
export async function completeUpload(userId: string, id: string) {
  const intent = await db.uploadIntent.findFirst({ where: { id, userId } });
  ensure(intent, '上传不存在');
  if (intent.status === 'COMPLETED') return { ok: true };
  ensure(intent.expiresAt > new Date(), '上传凭证已过期');
  const bytes = await readObject(intent.objectKey);
  ensure(bytes.length <= 20 * 1024 * 1024, '原图不能超过20MB');
  const meta = await sharp(bytes, { limitInputPixels: 24000000 }).metadata();
  ensure(['png', 'jpeg', 'webp'].includes(meta.format ?? ''), '文件内容不是支持的图片');
  ensure(meta.width && meta.height, '图片无效');
  const thumb = await sharp(bytes)
    .rotate()
    .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
    .webp()
    .toBuffer();
  const thumbKey = 'thumbnail/' + randomUUID();
  await putObject(thumbKey, thumb, 'image/webp');
  const tm = await sharp(thumb).metadata();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${intent.productId},0))`;
    const fresh = await tx.uploadIntent.findUnique({ where: { id } });
    if (fresh?.status === 'COMPLETED') return;
    const asset = await tx.imageAsset.create({
      data: {
        userId,
        kind: 'ORIGINAL',
        objectKey: intent.objectKey,
        mimeType: 'image/' + meta.format,
        width: meta.width!,
        height: meta.height!,
        bytes: bytes.length,
        checksum: createHash('sha256').update(bytes).digest('hex'),
      },
    });
    const thumbnail = await tx.imageAsset.create({
      data: {
        userId,
        kind: 'THUMBNAIL',
        objectKey: thumbKey,
        mimeType: 'image/webp',
        width: tm.width!,
        height: tm.height!,
        bytes: thumb.length,
        checksum: createHash('sha256').update(thumb).digest('hex'),
        sourceId: asset.id,
      },
    });
    await tx.product.update({
      where: { id: intent.productId },
      data: {
        originalId: asset.id,
        thumbnailId: thumbnail.id,
        enhancedId: null,
        selectedSource: 'ORIGINAL',
        imageVersion: { increment: 1 },
      },
    });
    await tx.uploadIntent.update({ where: { id }, data: { status: 'COMPLETED' } });
  });
  return { ok: true };
}
export async function requestEnhancement(userId: string, productId: string) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${productId},0))`;
    const p = await tx.product.findUnique({ where: { id: productId } });
    ensure(p?.originalId, '请先上传原图');
    const pending = await tx.imageJob.findFirst({
      where: {
        productId,
        imageVersion: p.imageVersion,
        status: { in: ['QUEUED', 'RUNNING', 'UNKNOWN'] },
      },
    });
    if (pending) return pending;
    await tx.product.update({ where: { id: productId }, data: { selectedSource: 'ENHANCED' } });
    return tx.imageJob.create({
      data: {
        userId,
        productId,
        originalId: p.originalId,
        imageVersion: p.imageVersion,
        provider: process.env.IMAGE_ENHANCEMENT_PROVIDER ?? 'mock',
      },
    });
  });
}
