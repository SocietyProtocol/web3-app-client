import { Address, zeroAddress } from "viem";
import { ChainVariable } from "./types";

interface ContractAddresses {
  badges: ChainVariable<Address>;
  auction: ChainVariable<Address>;
}

export const contracts: ContractAddresses = {
  badges: {
    sepolia: "0x76Aa1B43a651acc4320a4610af896ddfe38B428a",
    mainnet: zeroAddress, // Placeholder, replace with actual address when available
  },
  auction: {
    sepolia: "0x96aa924EF625bd8eF4A2C4d369408d1491453Ec5",
    mainnet: "0x0b7fFc1f4AD541A4Ed16b40D8c37f0929158D101",
  },
};
