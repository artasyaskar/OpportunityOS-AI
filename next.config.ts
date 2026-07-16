import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.65.42.8', 'localhost:3000', '192.168.0.103'],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '10.65.42.8:3000', '10.65.42.8', '192.168.0.103'],
    },
  },
  serverExternalPackages: ['tesseract.js'],
};

export default nextConfig;
