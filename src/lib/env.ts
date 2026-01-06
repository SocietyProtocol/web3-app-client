const isServer = typeof window === "undefined";

if (!process.env.NEXT_PUBLIC_ENVIRONMENT) {
  throw new Error("NEXT_PUBLIC_ENVIRONMENT environment variable is not set");
}

if (isServer && !process.env.PINATA_JWT) {
  throw new Error("PINATA_JWT environment variable is not set");
}

if (!process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL) {
  throw new Error(
    "NEXT_PUBLIC_PINATA_GATEWAY_URL environment variable is not set"
  );
}

if (!process.env.NEXT_PUBLIC_WC_PROJECT_ID) {
  throw new Error("NEXT_PUBLIC_WC_PROJECT_ID environment variable is not set");
}

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error(
    "NEXT_PUBLIC_ALCHEMY_API_KEY environment variable is not set"
  );
}

export const env = {
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL,
  wcProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  ...(isServer && { pinataJwt: process.env.PINATA_JWT }),
};
