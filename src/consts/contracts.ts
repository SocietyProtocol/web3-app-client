import { Address } from "viem";
import { ChainVariable } from "./types";

interface ContractAddresses {
  badges: ChainVariable<Address>;
  auction: ChainVariable<Address>;
  chainlinkFeed: ChainVariable<Address>;
}

export const contracts: ContractAddresses = {
  badges: {
    sepolia: "0x76Aa1B43a651acc4320a4610af896ddfe38B428a",
    mainnet: "0xa3af0da9733061da88b91ea28740780a887c8ce3",
  },
  auction: {
    sepolia: "0x96aa924EF625bd8eF4A2C4d369408d1491453Ec5",
    mainnet: "0x0b7fFc1f4AD541A4Ed16b40D8c37f0929158D101",
  },
  chainlinkFeed: {
    sepolia: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    mainnet: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  },
};
