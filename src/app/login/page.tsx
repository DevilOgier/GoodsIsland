import { db } from '@/infrastructure/db';
import Login from '@/components/login';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const setup = (await db.user.count()) === 0;
  return <Login setup={setup} />;
}
