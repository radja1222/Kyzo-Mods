import type { NextConfig } from "next";

const nextConfig: NextConfig = { 
  images: { 
    remotePatterns: [] 
  },
  // KONFIGURASI YANG BENAR UNTUK MEMATIKAN MIDDLEWARE:
  skipMiddlewareUrlNormalize: true,
};

export default nextConfig;
