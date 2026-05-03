import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom"],
  transpilePackages: ["@techmato/pipeline", "@techmato/types"],
  webpack(config, { isServer }) {
    if (isServer) {
      const externals = config.externals;
      config.externals = Array.isArray(externals)
        ? [...externals, "jsdom"]
        : [externals, "jsdom"].filter(Boolean);
    }

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
