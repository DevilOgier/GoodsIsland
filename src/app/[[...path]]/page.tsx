import { redirect } from 'next/navigation';
import { currentUser } from '@/infrastructure/auth';
import Cabinet from '@/components/cabinet';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const route = await params;
  const query = await searchParams;
  const user = await currentUser();
  if (!user) redirect('/login');
  return (
    <Cabinet
      key={(route.path ?? []).join('/') + JSON.stringify(query)}
      user={{ name: user.name, role: user.role }}
    />
  );
}
