import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '谷屿 · 谷子收藏柜',
  description: '把每一份喜欢，好好收藏。谷子图鉴、库存与收出物海报。',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '谷屿' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f8f7f3',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
