/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  serverExternalPackages: ["firebase-admin"],
  
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
    isrMemoryCacheSize: 0,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'firebase-admin': 'commonjs firebase-admin',
        'firebase-admin/app': 'commonjs firebase-admin/app',
        'firebase-admin/auth': 'commonjs firebase-admin/auth',
        'firebase-admin/firestore': 'commonjs firebase-admin/firestore',
        'firebase-admin/storage': 'commonjs firebase-admin/storage',
      })
      
      config.ignoreWarnings = [
        { module: /firebase-admin/ },
        { message: /Firebase/ },
      ]
    }
    
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new (require('@next/bundle-analyzer')({
          enabled: true,
        }))()
      )
    }
    
    return config
  },
  
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "firebasestorage.googleapis.com",
      "storage.googleapis.com",
      "pub-3626123a908346a7a8be8d9295f44e26.r2.dev",
    ],
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
  },
  
  compress: true,
  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ]
  },
}

export default nextConfig
