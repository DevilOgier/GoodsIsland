import { z } from 'zod';
import { requireUser } from '@/infrastructure/auth';
import { db } from '@/infrastructure/db';
import { createUpload, completeUpload, requestEnhancement } from '@/domain/image-service';
import { ensure } from '@/domain/errors';
import { fail, originGuard } from '@/lib/http';
export async function POST(request: Request) {
  try {
    originGuard(request);
    const user = await requireUser(true);
    const d = z
      .object({
        action: z.enum(['upload', 'complete', 'enhance', 'select', 'retry']),
        id: z.uuid(),
        mime: z.string().optional(),
        source: z.enum(['ORIGINAL', 'ENHANCED']).optional(),
      })
      .parse(await request.json());
    if (d.action === 'upload')
      return Response.json(await createUpload(user.id, d.id, d.mime ?? ''));
    if (d.action === 'complete') return Response.json(await completeUpload(user.id, d.id));
    if (d.action === 'enhance') return Response.json(await requestEnhancement(user.id, d.id));
    if (d.action === 'retry') {
      const job = await db.imageJob.findFirst({
        where: { id: d.id, userId: user.id, status: 'FAILED' },
      });
      ensure(job, '只能重试已知失败任务');
      await db.imageJob.update({ where: { id: d.id }, data: { status: 'QUEUED', error: null } });
      return Response.json({ ok: true });
    }
    const p = await db.product.findUnique({ where: { id: d.id } });
    ensure(p?.originalId, '暂无原图');
    ensure(d.source === 'ORIGINAL' || p.enhancedId, '请先生成增强图');
    await db.product.update({
      where: { id: d.id },
      data: { selectedSource: d.source ?? 'ORIGINAL' },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
