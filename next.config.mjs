

const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', 'fluent-ffmpeg', 'ffmpeg-static', 'busboy', 'archiver'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.facebook.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'node:fs': false,
        path: false,
        'node:path': false,
        os: false,
        'node:os': false,
        stream: false,
        'node:stream': false,
        crypto: false,
        'node:crypto': false,
      }
    }
    return config
  },
}

export default nextConfig
