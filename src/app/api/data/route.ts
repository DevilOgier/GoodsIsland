import { requireUser } from '@/infrastructure/auth';
import { snapshot } from '@/domain/query-service';
import { fail } from '@/lib/http';
export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await snapshot(user.id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return fail(e);
  }
}
