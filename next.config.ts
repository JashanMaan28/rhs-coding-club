import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'three',
      'postprocessing',
    ],
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    // Next.js 16 rejects any `quality` not listed here with HTTP 400.
    // 85 is required by <ResponsiveImage>; 75 is the framework default.
    qualities: [75, 85],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Compression
  compress: true,

  // Performance optimizations
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://tweakcn.com;",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/coding-challenges',
        destination: '/challenges',
        permanent: true,
      },
    ];
  },

  // Turbopack is the default bundler as of Next.js 16. An empty config is
  // sufficient here and keeps `next build` from erroring on a stray webpack
  // config. The previous `webpack: ...` splitChunks tweak was removed: builds
  // have used --turbopack since before this upgrade, so it never took effect.
  turbopack: {},
};

export default nextConfig;
