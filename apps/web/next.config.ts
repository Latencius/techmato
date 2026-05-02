import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mozilla/readability", "jsdom"],
  transpilePackages: ["@techmato/pipeline", "@techmato/types"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };

    return config;
  },
};

export default nextConfig;
