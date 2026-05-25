import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Prisma + pg adapter
  serverExternalPackages: ['@prisma/adapter-pg', 'pg'],
  // Allow Vercel deployment
  output: 'standalone',
}

export default nextConfig
