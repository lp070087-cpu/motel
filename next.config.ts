import type { NextConfig } from 'next';
const config: NextConfig = { distDir: process.env.NODE_ENV === 'production' ? '.next-production' : '.next', experimental: { cpus: 1, optimizePackageImports: ['three-stdlib'], webpackBuildWorker: false, webpackMemoryOptimizations: true } };
export default config;
