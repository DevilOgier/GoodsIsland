import Link from 'next/link';
import { Flower2, LogOut } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { appNavigation, routeActive } from './navigation';

export function Sidebar({
  path,
  user,
  onLogout,
}: {
  path: string;
  user: { name: string; role: string };
  onLogout: () => Promise<void>;
}) {
  return (
    <aside className="app-sidebar">
      <Link href="/" className="app-brand">
        <span className="app-brand__mark">
          <Flower2 size={23} />
        </span>
        <span>
          <strong>谷屿</strong>
          <small>GoodsIsland</small>
        </span>
      </Link>
      <p className="app-sidebar__label">我的收藏生活</p>
      <nav aria-label="主要导航">
        {appNavigation
          .filter((item) => !item.admin || user.role === 'ADMIN')
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={routeActive(path, href) ? 'is-active' : ''}
              aria-current={routeActive(path, href) ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
      </nav>
      <div className="app-sidebar__footer">
        <Flower2 size={18} />
        <p>
          把喜欢的，
          <br />
          都收藏起来吧。
        </p>
      </div>
      <Link href="/me" className="app-profile">
        <span className="app-avatar">{user.name.slice(0, 1)}</span>
        <span>
          <strong>{user.name}</strong>
          <small>{user.role === 'ADMIN' ? '图鉴管理员' : '个人收藏账号'}</small>
        </span>
      </Link>
      <IconButton
        className="app-sidebar__logout"
        aria-label="退出或切换账号"
        title="退出或切换账号"
        onClick={() => void onLogout()}
      >
        <LogOut size={16} />
      </IconButton>
    </aside>
  );
}
