import type { NextConfig } from "next";

const nextConfig: NextConfig = { 
  images: { 
    remotePatterns: [] 
  },
  // TAMBAHKAN BAGIAN INI DI BAWAHNYA UNTUK MEMATIKAN MIDDLEWARE SEMENTARA
  experimental: {
    skipMiddlewareUrlNormalize: true,
  },
};

export default nextConfig;
