import { requireUser } from '@/infrastructure/auth';
import { db } from '@/infrastructure/db';
import { readObject } from '@/infrastructure/storage';
import { fail } from '@/lib/http';
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const asset = await db.imageAsset.findUnique({ where: { id } });
    if (!asset) return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(await readObject(asset.objectKey)), {
      headers: {
        'Content-Type': asset.mimeType,
        'Cache-Control': 'private, max-age=86400',
        Vary: 'Cookie',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return fail(e);
  }
}
