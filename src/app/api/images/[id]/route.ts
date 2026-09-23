import { requireUser } from '@/infrastructure/auth';
import { db } from '@/infrastructure/db';
import { readObject } from '@/infrastructure/storage';
import { posterImage } from '@/infrastructure/poster-image';
import { posterImageSizes } from '@/poster/image-size';
import { fail } from '@/lib/http';
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const asset = await db.imageAsset.findUnique({ where: { id } });
    if (!asset) return new Response('Not found', { status: 404 });
    const requested = new URL(_r.url).searchParams.get('posterSize');
    const size = requested === null ? null : Number(requested);
    if (size !== null && !posterImageSizes.some((allowed) => allowed === size))
      return new Response('Invalid poster size', { status: 400 });
    const bytes =
      size === null ? await readObject(asset.objectKey) : await posterImage(asset.objectKey, size);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': size === null ? asset.mimeType : 'image/webp',
        'Cache-Control': 'private, max-age=86400',
        Vary: 'Cookie',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return fail(e);
  }
}
