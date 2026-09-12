import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Heart,
  LayoutDashboard,
  Palette,
  PackageOpen,
  ReceiptText,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = { href: string; label: string; icon: LucideIcon; admin?: boolean };

export const appNavigation: NavigationItem[] = [
  { href: '/', label: '我的小岛', icon: LayoutDashboard },
  { href: '/products', label: '谷子图鉴', icon: BookOpen },
  { href: '/inventory', label: '我的收藏柜', icon: Archive },
  { href: '/purchases', label: '买入记录', icon: ArrowDownLeft },
  { href: '/sales', label: '卖出记录', icon: ArrowUpRight },
  { href: '/accounting', label: '收支账本', icon: ReceiptText },
  { href: '/groups', label: '我的拼团', icon: Users },
  { href: '/wanted', label: '收物心愿', icon: Heart },
  { href: '/listings', label: '正在出物', icon: PackageOpen },
  { href: '/posters', label: '海报工坊', icon: Palette },
  { href: '/admin', label: '图鉴管理', icon: Settings, admin: true },
];

export const mobileNavigation = [
  { ...appNavigation[0], label: '首页' },
  { ...appNavigation[1], label: '图鉴' },
  { ...appNavigation[2], label: '收藏柜' },
  { ...appNavigation[7], label: '心愿' },
  { href: '/me', label: '我的', icon: UserRound },
];

export function routeActive(path: string, href: string) {
  return path === href || (href !== '/' && path.startsWith(href + '/'));
}
