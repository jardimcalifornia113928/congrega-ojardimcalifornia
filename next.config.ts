import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@base-ui/react"],
  webpack: (config) => {
    config.resolve.conditionNames = [
      "browser",
      "import",
      "module",
      "default",
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      canvg: false,
      dompurify: false,
    };
    return config;
  },
};

export default nextConfig;
