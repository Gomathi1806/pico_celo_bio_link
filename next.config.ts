import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
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
