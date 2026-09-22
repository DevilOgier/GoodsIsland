import { db } from '@/infrastructure/db';
import { rememberedAccounts } from '@/infrastructure/auth';
import Login from '@/components/login';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const setup = (await db.user.count()) === 0;
  const accounts = setup ? [] : await rememberedAccounts();
  return <Login setup={setup} accounts={accounts} />;
}
