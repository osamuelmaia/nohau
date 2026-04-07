

const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', 'fluent-ffmpeg', 'ffmpeg-static', 'busboy', 'archiver', 'pptxgenjs'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.facebook.com' },
    ],
  },
}

export default nextConfig
