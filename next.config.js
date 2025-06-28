// Set up logging before anything else
// Temporarily disabled for debugging
// try {
//   require('./src/lib/setup-logging.js');
// } catch (error) {
//   console.error('Failed to set up logging:', error);
// }

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Subdirectory configuration for www.targonglobal.com/WMS
  basePath: process.env.NODE_ENV === 'production' ? '/WMS' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/WMS' : '',
  
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
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
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
  
  // Simplified webpack configuration
  webpack: (config) => {
    return config
  },
  
  // Temporarily disable experimental features
  experimental: {
    // optimizeCss: true,
    // optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
}

module.exports = nextConfig