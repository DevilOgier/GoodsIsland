import { requireUser } from '@/infrastructure/auth';
import { db } from '@/infrastructure/db';
import { putObject } from '@/infrastructure/storage';
import { ensure } from '@/domain/errors';
import { fail, originGuard } from '@/lib/http';
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    originGuard(request);
    const user = await requireUser(true);
    const { id } = await context.params;
    const intent = await db.uploadIntent.findFirst({
      where: { id, userId: user.id, status: 'PENDING' },
    });
    ensure(intent && intent.expiresAt > new Date(), '上传凭证无效或过期');
    ensure(request.headers.get('content-type') === intent.mimeType, '图片类型不匹配');
    const reader = request.body?.getReader();
    ensure(reader, '图片为空');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 20 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('图片不能超过20MB');
      }
      chunks.push(value);
    }
    ensure(size > 0, '图片为空');
    await putObject(intent.objectKey, Buffer.concat(chunks), intent.mimeType);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
