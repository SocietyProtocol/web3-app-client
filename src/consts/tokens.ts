import { Address } from "viem";
import { ChainVariable } from "./types";

interface Tokens {
  spec: ChainVariable<Address>;
}

export const tokens: Tokens = {
  spec: {
    sepolia: "0xe4a566a04aed9f938bba16d47d859a706bc4949a",
    mainnet: "0x0",
  },
};
