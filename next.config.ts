import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Ganti dengan nama yang benar sesuai instruksi Vercel:
  skipProxyUrlNormalize: true,
};

export default nextConfig;
