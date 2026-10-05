import { z } from 'zod';
import { requireUser } from '@/infrastructure/auth';
import { fail } from '@/lib/http';
import { catalogStatus } from '@/domain/catalog-export-service';
import { readObject } from '@/infrastructure/storage';
import { ensure } from '@/domain/errors';
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireUser();
    const { key } = await params;
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(key);
    const status = await catalogStatus(key);
    if (new URL(request.url).searchParams.get('download') === '1') {
      ensure(status.status === 'ready', '图鉴正在生成，请稍后下载', 409);
      const bytes = await readObject('catalog/' + key);
      return new Response(new Uint8Array(bytes), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': String(bytes.length),
          'Content-Disposition':
            "attachment; filename=GoodsIsland-catalog.png; filename*=UTF-8''" +
            encodeURIComponent(('title' in status ? status.title : '图鉴') + '.png'),
          'Cache-Control': 'private, no-store',
        },
      });
    }
    return Response.json(status, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return fail(error);
  }
}
