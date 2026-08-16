import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Ganti nama ini sesuai instruksi Vercel:
  skipProxyUrlNormalize: true,
};

export default nextConfig;
