import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { appNavigation } from './navigation';

const primaryMobileRoutes = new Set(['/', '/products', '/inventory', '/wanted']);

export function MoreMenu({ role }: { role: string }) {
  const items = appNavigation.filter(
    (item) => !primaryMobileRoutes.has(item.href) && (!item.admin || role === 'ADMIN'),
  );
  return (
    <section className="app-more-menu" aria-labelledby="more-menu-title">
      <div className="app-more-menu__heading">
        <span>MORE TOOLS</span>
        <h2 id="more-menu-title">更多功能</h2>
        <p>买卖记录、拼团、账本与海报都在这里。</p>
      </div>
      <div className="more-grid">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
