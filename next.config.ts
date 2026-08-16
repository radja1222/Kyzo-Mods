import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // INI BENAR! TIDAK ADA "experimental" DI SINI.
  skipMiddlewareUrlNormalize: true,
};

export default nextConfig;
