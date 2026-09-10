'use client';
import { useState, type ReactNode } from 'react';
import type { Snapshot } from '@/components/types';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';
import { MobileNavigation } from './mobile-navigation';
import { QuickActionSheet, type QuickAction } from './quick-action-sheet';

export function AppShell({
  path,
  section,
  user,
  data,
  onLogout,
  onQuickAction,
  children,
}: {
  path: string;
  section: string;
  user: { name: string; role: string };
  data: Snapshot | null;
  onLogout: () => Promise<void>;
  onQuickAction: (action: QuickAction) => void;
  children: ReactNode;
}) {
  const [quickOpen, setQuickOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar path={path} user={user} onLogout={onLogout} />
      <main className="app-main">
        <TopHeader
          section={section}
          user={user}
          products={data?.products ?? []}
          characters={data?.characters ?? []}
          series={data?.series ?? []}
          onQuickOpen={() => setQuickOpen(true)}
        />
        {children}
      </main>
      <MobileNavigation path={path} />
      <QuickActionSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAction={onQuickAction}
      />
    </div>
  );
}
