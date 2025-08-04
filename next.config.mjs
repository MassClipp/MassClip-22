/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@firebase/app-types'],
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
  // Critical: Configure body size limits for webhooks
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  // Ensure raw body handling for webhooks
  async rewrites() {
    return [
      {
        source: '/api/webhooks/stripe',
        destination: '/api/webhooks/stripe',
      },
    ]
  },
}

export default nextConfig
