import { ChainVariable } from "./types";
import { env } from "@/lib/env";

/**
 * Unified subgraph endpoint per network.
 * Uses NEXT_PUBLIC_GRAPH_URL for both testnet (Sepolia) and mainnet.
 */
export const subgraphs: ChainVariable<string> = {
  sepolia: env.graphUrl,
  mainnet: env.graphUrl,
};
