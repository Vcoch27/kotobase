/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    workerThreads: false,
    cpus: 1,
    outputFileTracingIncludes: {
      '/**': ['./data/**/*'],
    },
  },
};

module.exports = nextConfig;
