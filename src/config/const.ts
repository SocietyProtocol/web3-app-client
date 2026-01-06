import { env } from "@/lib/env";
/**
 * External URLs and endpoints used throughout the application
 */

export const URLS = {
  // Block explorers
  ETHERSCAN_MAINNET: "https://etherscan.io",
  ETHERSCAN_SEPOLIA: "https://sepolia.etherscan.io",

  // IPFS gateways
  IPFS_GATEWAY: `https://${env.pinataGateway}/ipfs`,
  IPFS_FALLBACK_GATEWAY: "https://ipfs.io/ipfs",

  // The Graph subgraphs
  SUBGRAPH: {
    SEPOLIA: {
      BADGES:
        "https://api.studio.thegraph.com/query/46833/society-badges-testnet/version/latest",
      AUCTION:
        "https://api.studio.thegraph.com/query/46833/society-auction-testnet/version/latest",
    },
    MAINNET: {
      BADGES:
        "https://api.studio.thegraph.com/query/46833/society-badges-mainnet/version/latest",
      AUCTION:
        "https://api.studio.thegraph.com/query/46833/society-auction-mainnet/version/latest",
    },
  },
} as const;
