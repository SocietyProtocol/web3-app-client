import { Hex } from "viem";

interface ContractAddresses {
  badges: Hex;
  auction: Hex;
}

interface Contracts {
  sepolia: ContractAddresses;
  mainnet: ContractAddresses;
}

export const contracts: Contracts = {
  sepolia: {
    badges: "0x21d798f885609b228D05a75f8bD9a4De538fbf11",
    auction: "0x96aa924EF625bd8eF4A2C4d369408d1491453Ec5",
  },
  mainnet: {
    // Placeholder addresses; replace with actual contract addresses when deployed
    badges: "0x",
    auction: "0x0b7fFc1f4AD541A4Ed16b40D8c37f0929158D101",
  },
};
