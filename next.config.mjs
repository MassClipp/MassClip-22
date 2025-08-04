/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      'massclip.pro',
      'www.massclip.pro',
      'masscliptest.vercel.app',
      'pub-b8b279c2f8a64b8b9c42a8c8c5c5c5c5.r2.dev',
    ],
    unoptimized: true,
  },
  // Remove API configuration that might interfere with webhooks
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
}

export default nextConfig
