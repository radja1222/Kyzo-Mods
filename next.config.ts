import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Saya hapus bagian "experimental" yang salah
  images: {
    remotePatterns: [],
  },
  // Ini adalah konfigurasi yang benar, tidak perlu dibungkus experimental:
  skipMiddlewareUrlNormalize: true,
};

export default nextConfig;
