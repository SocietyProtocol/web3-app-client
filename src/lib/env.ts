interface ClientEnv {
  environment: string;
  pinataGateway: string;
  wcProjectId: string;
  alchemyApiKey: string;
  auctionId?: number;
  snapshotUrl: string;
  graphUrl: string;
}

interface ServerEnv {
  pinataJwt: string;
}

type Env = ClientEnv & Partial<ServerEnv>;

const isServer = typeof window === "undefined";

// for both client and server sides
if (!process.env.NEXT_PUBLIC_ENVIRONMENT) {
  throw new Error("NEXT_PUBLIC_ENVIRONMENT environment variable is not set");
}

if (!process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL) {
  throw new Error(
    "NEXT_PUBLIC_PINATA_GATEWAY_URL environment variable is not set",
  );
}

if (!process.env.NEXT_PUBLIC_WC_PROJECT_ID) {
  throw new Error("NEXT_PUBLIC_WC_PROJECT_ID environment variable is not set");
}

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error(
    "NEXT_PUBLIC_ALCHEMY_API_KEY environment variable is not set",
  );
}

if (!process.env.NEXT_PUBLIC_SNAPSHOT_URL) {
  throw new Error("NEXT_PUBLIC_SNAPSHOT_URL environment variable is not set");
}

if (!process.env.NEXT_PUBLIC_GRAPH_URL) {
  throw new Error("NEXT_PUBLIC_GRAPH_URL environment variable is not set");
}

// server-side only
if (isServer && !process.env.PINATA_JWT) {
  throw new Error("PINATA_JWT environment variable is not set");
}

export const env: Env = {
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL,
  wcProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  auctionId: process.env.NEXT_PUBLIC_AUCTION_ID
    ? parseInt(process.env.NEXT_PUBLIC_AUCTION_ID, 10)
    : undefined,
  snapshotUrl: process.env.NEXT_PUBLIC_SNAPSHOT_URL,
  graphUrl: process.env.NEXT_PUBLIC_GRAPH_URL,
  ...(isServer && { pinataJwt: process.env.PINATA_JWT }),
};
