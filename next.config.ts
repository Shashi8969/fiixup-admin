import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'vpnztzzsyzgesnpihxsu.supabase.co' },
      { protocol: 'https', hostname: 'fiixup.in' },
    ],
  },
}

export default nextConfig
