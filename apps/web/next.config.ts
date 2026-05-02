import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@techmato/pipeline", "@techmato/types"],
};

export default nextConfig;
