import { sepolia } from "viem/chains";
import { ChainVariable } from "@/consts/types";

/**
 * Picks the value of a per-chain constant for the given chain id. Sepolia is
 * the only non-production network, so every other chain id resolves to the
 * mainnet value.
 */
export const pickChainVar = <T>(variable: ChainVariable<T>, chainId: number): T =>
  chainId === sepolia.id ? variable.sepolia : variable.mainnet;
