import { ChainVariable } from "./types";
import { URLS } from "./urls";

interface SubgraphEndpoints {
  badges: string;
  auction: string;
}

export const subgraphs: ChainVariable<SubgraphEndpoints> = {
  sepolia: {
    badges: URLS.SUBGRAPH.SEPOLIA.BADGES,
    auction: URLS.SUBGRAPH.SEPOLIA.AUCTION,
  },
  mainnet: {
    badges: URLS.SUBGRAPH.MAINNET.BADGES,
    auction: URLS.SUBGRAPH.MAINNET.AUCTION,
  },
};
