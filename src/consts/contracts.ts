import { Address } from "viem";
import { ChainVariable } from "./types";

interface ContractAddresses {
  badges: ChainVariable<Address>;
  auction: ChainVariable<Address>;
  chainlinkFeed: ChainVariable<Address>;
  vipManager: ChainVariable<Address>;
  communityRegistry: ChainVariable<Address>;
}

export const contracts: ContractAddresses = {
  badges: {
    sepolia: "0x12406bB6d11Cb641e100F1d8595c0C5e63F0bD47",
    mainnet: "0x2313C0cDdc233c92d16c2cfE17DF5fDCcE556763",
  },
  auction: {
    sepolia: "0x96aa924EF625bd8eF4A2C4d369408d1491453Ec5",
    mainnet: "0x0b7fFc1f4AD541A4Ed16b40D8c37f0929158D101",
  },
  chainlinkFeed: {
    sepolia: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    mainnet: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  },
  vipManager: {
    sepolia: "0x51B7481dDe7Fd0b793dbF0CAabcCd6B78D9790DF",
    mainnet: "0x884026e36e772d72beE641F6C0d78A875e867117",
  },
  communityRegistry: {
    sepolia: "0xE517446f4AC1035E334B5AEc57941F2644BA8639",
    mainnet: "0xEa008f15E1454C79D6AA7B95Dd3E1d39Ba32EB76",
  },
};
