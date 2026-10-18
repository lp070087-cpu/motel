import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: '.next',
  experimental: {
    cpus: 1,
    optimizePackageImports: ['three-stdlib'],
    webpackBuildWorker: false,
    webpackMemoryOptimizations: true,
  },
};

export default config;