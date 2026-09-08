import { requireUser } from '@/infrastructure/auth';
import { command } from '@/domain/commands';
import { fail, originGuard } from '@/lib/http';
import { z } from 'zod';
export async function POST(request: Request) {
  try {
    originGuard(request);
    const user = await requireUser();
    const body = z.object({ operation: z.string(), data: z.unknown() }).parse(await request.json());
    return Response.json(
      await command(user, body.operation, body.data, request.headers.get('Idempotency-Key') ?? ''),
    );
  } catch (e) {
    return fail(e);
  }
}
