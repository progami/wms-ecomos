// CI-specific Next.js configuration
// This config is used for CI builds where standalone output causes issues

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Base path configuration - set BASE_PATH env var if needed
  basePath: process.env.BASE_PATH || '',
  assetPrefix: process.env.BASE_PATH || '',
  
  // Production optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['localhost', 'targonglobal.com', 'www.targonglobal.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Strict mode for development
  reactStrictMode: true,
  
  // Production source maps (disable for security)
  productionBrowserSourceMaps: false,
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    return config
  },
  
  // Enable experimental features for production optimization
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', '@radix-ui/react-icons', '@radix-ui/react-dialog', '@radix-ui/react-select'],
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  
  // Additional production optimizations
  compiler: {
    removeConsole: false, // Keep console logs in CI for debugging
  },
  
  // IMPORTANT: No standalone output for CI
  // output: 'standalone', // Commented out for CI
  
  // Disable ESLint during production builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during production builds for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig