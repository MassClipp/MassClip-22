/** @type {import('next').NextConfig} */
const nextConfig = {
  // Packages that must be bundled for the server runtime
  serverExternalPackages: ['firebase-admin'],

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}

export default nextConfig
