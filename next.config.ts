import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pino",
    "thread-stream",
    "@walletconnect/ethereum-provider",
    "pinata",
  ],
};

export default nextConfig;
