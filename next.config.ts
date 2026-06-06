import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'vpnztzzsyzgesnpihxsu.supabase.co' },
      { protocol: 'https', hostname: 'fiixup.in' },
    ],
  },
}

export default nextConfig
