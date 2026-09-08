import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'sharp'],
  devIndicators: false,
};
export default config;
