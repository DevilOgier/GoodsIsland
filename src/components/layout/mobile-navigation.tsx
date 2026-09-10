import Link from 'next/link';
import { mobileNavigation, routeActive } from './navigation';

export function MobileNavigation({ path }: { path: string }) {
  return (
    <nav className="app-mobile-nav" aria-label="手机主导航">
      {mobileNavigation.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={routeActive(path, href) ? 'is-active' : ''}
          aria-current={routeActive(path, href) ? 'page' : undefined}
        >
          <Icon size={21} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
