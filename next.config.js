const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@/domain': path.resolve(__dirname, 'src/domain.ts'),
      '@/infrastructure': path.resolve(__dirname, 'src/infrastructure.ts'),
      '@/application': path.resolve(__dirname, 'src/application.ts'),
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

module.exports = nextConfig;
