interface ClientEnv {
  environment: string;
  wcProjectId: string;
  alchemyApiKey: string;
  auctionId?: number;
  snapshotUrl: string;
  snapshotSpecUrl: string;
  graphUrl: string;
  heroVideoUrl?: string;
  posthogProjectToken?: string;
  posthogHost?: string;
}

type Env = ClientEnv;

// for both client and server sides
if (!process.env.NEXT_PUBLIC_ENVIRONMENT) {
  throw new Error("NEXT_PUBLIC_ENVIRONMENT environment variable is not set");
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

if (!process.env.NEXT_PUBLIC_SNAPSHOT_SPEC_URL) {
  throw new Error(
    "NEXT_PUBLIC_SNAPSHOT_SPEC_URL environment variable is not set",
  );
}

if (!process.env.NEXT_PUBLIC_GRAPH_URL) {
  throw new Error("NEXT_PUBLIC_GRAPH_URL environment variable is not set");
}

export const env: Env = {
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  wcProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  auctionId: process.env.NEXT_PUBLIC_AUCTION_ID
    ? parseInt(process.env.NEXT_PUBLIC_AUCTION_ID, 10)
    : undefined,
  snapshotUrl: process.env.NEXT_PUBLIC_SNAPSHOT_URL,
  snapshotSpecUrl: process.env.NEXT_PUBLIC_SNAPSHOT_SPEC_URL,
  graphUrl: process.env.NEXT_PUBLIC_GRAPH_URL,
  heroVideoUrl: process.env.NEXT_PUBLIC_HERO_VIDEO_URL,
  posthogProjectToken: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
};
