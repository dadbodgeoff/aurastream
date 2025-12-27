/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for containerized/serverless deployments
  output: 'standalone',
  transpilePackages: [
    '@aurastream/ui',
    '@aurastream/api-client',
    '@aurastream/shared',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Environment variables that should be available at build time
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://aurastream.shop',
  },
};

module.exports = nextConfig;
