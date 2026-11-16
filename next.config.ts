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
  env: {
    // The mark of the hermetic test suite's own build (src/lib/e2e-build.ts).
    // Next inlines a NEXT_PUBLIC_ variable only when it is set at build time;
    // an unset one stays a live process.env read in the server bundle, which
    // the server's runtime environment could then switch on. Listing it here
    // inlines it into every bundle, server included, whatever the build had:
    // "1" for the suite's build, "" for every other build.
    NEXT_PUBLIC_E2E_BUILD: process.env.NEXT_PUBLIC_E2E_BUILD === "1" ? "1" : "",
  },
  serverExternalPackages: [
    "pino",
    "thread-stream",
    "@walletconnect/ethereum-provider",
    "@aws-sdk/client-s3",
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
