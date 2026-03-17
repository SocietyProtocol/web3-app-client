import { ChainVariable } from "./types";
import { env } from "@/lib/env";

/**
 * Unified subgraph endpoint per network.
 * Testnet (Sepolia) uses NEXT_PUBLIC_GRAPH_URL.
 * Mainnet uses NEXT_PUBLIC_GRAPH_URL_MAINNET when set, otherwise falls back to
 * NEXT_PUBLIC_GRAPH_URL (useful when building a dedicated mainnet bundle).
 */
export const subgraphs: ChainVariable<string> = {
  sepolia: env.graphUrl,
  mainnet: env.graphUrlMainnet ?? env.graphUrl,
};
