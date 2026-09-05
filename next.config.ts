import type { NextConfig } from "next";

// RainbowKit pulls Coinbase CDP, which statically imports optional x402/Solana
// peers the Outpost does not use. Next 16 Turbopack fails the build on those.
const optionalWalletModules = [
  "@x402/core",
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm",
  "@x402/svm/exact/client",
  "@solana/kit",
] as const;

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pino",
    "thread-stream",
    "@walletconnect/ethereum-provider",
    "pinata",
    "node-libcurl",
    "@whatwg-node/fetch",
  ],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    const existing = config.resolve.alias;
    const alias: Record<string, string | false> =
      existing && !Array.isArray(existing)
        ? { ...(existing as Record<string, string | false>) }
        : {};
    for (const name of optionalWalletModules) {
      alias[name] = false;
    }
    config.resolve.alias = alias;
    return config;
  },
};

export default nextConfig;
