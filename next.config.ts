import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // `npm run typecheck` is the dedicated gate; build stays focused on bundling.
    ignoreBuildErrors: true,
  },
  experimental: {
    useTypeScriptCli: false,
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
