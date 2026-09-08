import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '谷屿 · 谷子收藏柜',
    short_name: '谷屿',
    description: '把每一份喜欢，好好收藏',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8f7f3',
    theme_color: '#f8f7f3',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
