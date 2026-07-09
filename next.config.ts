import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Rewrite /@handle → /handle so URLs look like /@karthik
      {
        source: '/@:handle',
        destination: '/:handle',
      },
    ];
  },
};

export default nextConfig;
