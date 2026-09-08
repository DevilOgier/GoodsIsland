import { redirect } from 'next/navigation';
import { currentUser } from '@/infrastructure/auth';
import Cabinet from '@/components/cabinet';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <Cabinet user={{ name: user.name, role: user.role }} />;
}
