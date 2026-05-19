/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecole-saas/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
