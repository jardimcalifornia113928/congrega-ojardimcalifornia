import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@base-ui/react"],
};

export default nextConfig;
