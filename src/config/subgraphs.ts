import { URLS } from "./const";

interface SubgraphEndpoints {
  badges: string;
  auction: string;
}

interface Subgraphs {
  sepolia: SubgraphEndpoints;
  mainnet: SubgraphEndpoints;
}

export const subgraphs: Subgraphs = {
  sepolia: {
    badges: URLS.SUBGRAPH.SEPOLIA.BADGES,
    auction: URLS.SUBGRAPH.SEPOLIA.AUCTION,
  },
  mainnet: {
    badges: URLS.SUBGRAPH.MAINNET.BADGES,
    auction: URLS.SUBGRAPH.MAINNET.AUCTION,
  },
};
