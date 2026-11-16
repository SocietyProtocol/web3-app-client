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
  // Society Protocol's YouTube channel, confirmed by the project owner on
  // 2026-11-16. Set to null to hide the YouTube link in the top bar and drawer.
  YOUTUBE: "https://www.youtube.com/@SocietyProtocolStream" as string | null,
} as const;
