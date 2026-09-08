import { db } from '../infrastructure/db';
import { readObject } from '../infrastructure/storage';
import { enhancementProvider, UnknownSubmission } from '../infrastructure/enhancement';
import { saveAsset } from '../domain/image-service';
import sharp from 'sharp';
async function run() {
  const job = await db.$transaction(async (tx) => {
    await tx.imageJob.updateMany({
      where: {
        status: 'RUNNING',
        leaseUntil: { lt: new Date() },
        providerRequestId: null,
        provider: 'topaz',
      },
      data: { status: 'UNKNOWN', error: 'worker 中断，提交结果待核对' },
    });
    await tx.imageJob.updateMany({
      where: {
        status: 'RUNNING',
        leaseUntil: { lt: new Date() },
        OR: [{ provider: 'mock' }, { providerRequestId: { not: null } }],
      },
      data: { status: 'QUEUED' },
    });
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "ImageJob" WHERE status='QUEUED' ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!rows.length) return null;
    return tx.imageJob.update({
      where: { id: rows[0].id },
      data: {
        status: 'RUNNING',
        attempts: { increment: 1 },
        leaseUntil: new Date(Date.now() + 120000),
      },
    });
  });
  if (!job) return;
  try {
    const original = await db.imageAsset.findUniqueOrThrow({ where: { id: job.originalId } });
    const output = await enhancementProvider(job.provider).enhance({
      bytes: await readObject(original.objectKey),
      processId: job.providerRequestId ?? undefined,
      onSubmitted: async (id) => {
        await db.imageJob.update({ where: { id: job.id }, data: { providerRequestId: id } });
      },
      heartbeat: async () => {
        await db.imageJob.update({
          where: { id: job.id },
          data: { leaseUntil: new Date(Date.now() + 120000) },
        });
      },
    });
    const enhanced = await saveAsset(
      job.userId,
      'ENHANCED',
      output.bytes,
      original.id,
      output.isMock,
    );
    const thumb = await saveAsset(
      job.userId,
      'THUMBNAIL',
      await sharp(output.bytes).resize(640, 640, { fit: 'inside' }).webp().toBuffer(),
      enhanced.id,
      output.isMock,
    );
    await db.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { id: job.productId, imageVersion: job.imageVersion, originalId: job.originalId },
        data: { enhancedId: enhanced.id, thumbnailId: thumb.id },
      });
      await tx.imageJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', leaseUntil: null },
      });
    });
  } catch (error) {
    await db.imageJob.update({
      where: { id: job.id },
      data: {
        status: error instanceof UnknownSubmission ? 'UNKNOWN' : 'FAILED',
        error: error instanceof Error ? error.message : '增强失败',
        leaseUntil: null,
      },
    });
  }
}
console.log('图片 worker 已启动');
while (true) {
  try {
    await run();
  } catch (e) {
    console.error('worker: ' + (e as Error).message);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
