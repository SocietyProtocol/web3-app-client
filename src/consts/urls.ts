/**
 * External URLs and endpoints used throughout the application
 */

export const URLS = {
  // Block explorers
  ETHERSCAN_MAINNET: "https://etherscan.io",
  ETHERSCAN_SEPOLIA: "https://sepolia.etherscan.io",

  // IPFS gateways
  IPFS_GATEWAY: `https://ipfs.filebase.io/ipfs`,

  // Society Protocol
  WEBSITE: "https://societyprotocol.io",
  FORUM: "https://forum.societyprotocol.io",
  DOCS: "https://docs.societyprotocol.io",

  // Social
  TWITTER: "https://x.com/ProtocolSociety",
  DISCORD: "https://discord.com/invite/fpk7eH7aWQ",
  // TODO: set the Society Protocol YouTube channel URL. The YouTube link
  // stays hidden in the top bar and drawer until this is set.
  YOUTUBE: null as string | null,
} as const;
