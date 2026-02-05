import { Address } from "viem";

interface ContractAddresses {
  badges: Address;
  auction: Address;
}

interface Contracts {
  sepolia: ContractAddresses;
  mainnet: ContractAddresses;
}

export const contracts: Contracts = {
  sepolia: {
    badges: "0x76Aa1B43a651acc4320a4610af896ddfe38B428a",
    auction: "0x96aa924EF625bd8eF4A2C4d369408d1491453Ec5",
  },
  mainnet: {
    // Placeholder addresses; replace with actual contract addresses when deployed
    badges: "0x",
    auction: "0x0b7fFc1f4AD541A4Ed16b40D8c37f0929158D101",
  },
};
