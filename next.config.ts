import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "polished-minnow-57.convex.cloud",
        protocol: "https"
      }
    ]
  }
};

export default nextConfig;
