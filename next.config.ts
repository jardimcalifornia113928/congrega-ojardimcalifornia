import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite gerar um build de produção separado sem parar o `next dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
