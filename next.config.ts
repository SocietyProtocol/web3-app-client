import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pino",
    "thread-stream",
    "@walletconnect/ethereum-provider",
    "pinata",
    "node-libcurl",
    "@whatwg-node/fetch",
  ],
};

export default nextConfig;
