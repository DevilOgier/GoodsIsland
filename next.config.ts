import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'sharp'],
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/fonts/:family(invitation-song|poster-wenkai|poster)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};
export default config;
