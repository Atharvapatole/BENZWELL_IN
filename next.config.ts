import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async rewrites() {
    return [
      {
        source: '/thank-you-:slug',
        destination: '/thank-you/:slug',
      },
      {
        source: '/product-download/:token',
        destination: '/download/:token',
      },
      {
        source: '/product-download-:token',
        destination: '/download/:token',
      },
      {
        source: '/free-tool-:slug',
        destination: '/free-tools/free-tool-:slug',
      },
      {
        source: '/free-tools-:slug',
        destination: '/free-tools/:slug',
      },
    ];
  },
};

export default nextConfig;
