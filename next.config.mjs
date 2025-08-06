/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Remove the deprecated serverComponentsExternalPackages
    // Use serverExternalPackages instead
  },
  serverExternalPackages: [
    'firebase-admin',
    '@firebase/admin',
    'firebase-functions',
    'sharp'
  ],
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
      'storage.googleapis.com'
    ],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    return config
  },
}

export default nextConfig
