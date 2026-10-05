import { z } from 'zod';
import { requireUser } from '@/infrastructure/auth';
import { originGuard, fail } from '@/lib/http';
import { requestCatalog } from '@/domain/catalog-export-service';
export async function POST(request: Request) {
  try {
    originGuard(request);
    await requireUser();
    const input = z
      .object({
        type: z.string().min(1).max(100),
        character: z.string().uuid().or(z.literal('')).default(''),
        ids: z.array(z.uuid()).min(1).max(500).optional(),
        title: z.string().max(100).default(''),
        showDate: z.boolean().default(false),
      })
      .parse(await request.json());
    return Response.json(await requestCatalog(input), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return fail(error);
  }
}
