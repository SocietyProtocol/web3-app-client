# Society Protocol Client

A web client for [Society Protocol](https://society.finance) — a framework for creating Synchronized Network States. Built with Next.js 16, TypeScript, MUI v7, wagmi/viem, RainbowKit, and Jotai.

## Stack

| Layer     | Technology                                |
| --------- | ----------------------------------------- |
| Framework | Next.js 16 (App Router)                   |
| Language  | TypeScript (strict)                       |
| UI        | MUI v7 + Emotion                          |
| Web3      | wagmi v2 · viem v2 · RainbowKit v2        |
| State     | Jotai v2 · TanStack Query v5              |
| GraphQL   | `@graphprotocol/client-cli` (graphclient) |
| IPFS      | Pinata SDK v2                             |
| Forms     | React Hook Form v7 · Zod v4               |

---

## Getting Started

### 1. Prerequisites

- Node.js **18.x** or later
- Yarn

### 2. Environment Variables

Copy the example file and fill in the required values:

```bash
cp .env.example .env.local
```

| Variable                            | Required | Description                                                                                                                                                | Where to get                                                |
| ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_ENVIRONMENT`           | ✅       | `development` → Sepolia · `production` → Mainnet                                                                                                           | —                                                           |
| `NEXT_PUBLIC_WC_PROJECT_ID`         | ✅       | WalletConnect project ID                                                                                                                                   | [cloud.walletconnect.com](https://cloud.walletconnect.com/) |
| `NEXT_PUBLIC_ALCHEMY_API_KEY`       | ✅       | Alchemy API key for Ethereum RPC                                                                                                                           | [alchemy.com](https://www.alchemy.com/)                     |
| `NEXT_PUBLIC_GRAPH_URL`             | ✅       | Unified subgraph URL used for this deployment (mainnet for production and testnet for development & staging) — also used by GraphQL code-gen at build time | Your Graph Studio deployment                                |
| `NEXT_PUBLIC_PINATA_GATEWAY_URL`    | ✅       | Pinata IPFS gateway URL                                                                                                                                    | [pinata.cloud](https://pinata.cloud/)                       |
| `PINATA_JWT`                        | ✅       | Pinata JWT for **server-side** IPFS uploads — never exposed to the browser                                                                                 | [pinata.cloud](https://pinata.cloud/)                       |
| `NEXT_PUBLIC_SNAPSHOT_URL`          | ✅       | Snapshot governance space URL                                                                                                                              | [snapshot.box](https://snapshot.box/)                       |
| `NEXT_PUBLIC_AUCTION_ID`            | —        | ID of the auction to interact with                                                                                                                         | Smart contract deployment                                   |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | —        | PostHog project token used to enable client-side analytics, pageviews, and event tracking                                                                  | Your PostHog project settings                               |
| `NEXT_PUBLIC_POSTHOG_HOST`          | —        | PostHog ingest host override, typically `https://us.i.posthog.com` or `https://eu.i.posthog.com`; leave unset to use the SDK default                       | Your PostHog deployment or region                           |

> **Note:** Variables prefixed with `NEXT_PUBLIC_` are embedded in the client bundle. Never place secrets (e.g. `PINATA_JWT`) in a `NEXT_PUBLIC_` variable. PostHog analytics remain disabled unless `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is set.

### 3. Install & Run

```bash
# Install dependencies (also runs graphclient code-gen via postinstall)
yarn install

# Start the development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Available Scripts

| Script            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `yarn dev`        | GraphQL code-gen + Next.js dev server with hot reload |
| `yarn build`      | GraphQL code-gen + production build                   |
| `yarn start`      | Start the production server                           |
| `yarn codegen`    | Regenerate the GraphQL client from subgraph schema    |
| `yarn type-check` | TypeScript type check without emitting                |
| `yarn lint`       | ESLint                                                |
| `yarn test`       | Vitest unit tests                                     |

---

## Project Structure

```
src/
├── abis/          # Contract ABIs
├── app/           # Next.js App Router pages & layouts
├── atoms/         # Jotai global atoms
├── components/    # React components
├── consts/        # App-wide constants (contracts, URLs, tokens…)
├── data/          # Data-fetching hooks & utilities (per domain)
├── errors/        # Custom error classes
├── hooks/         # Shared custom hooks
├── lib/           # Library setup (wagmi, env, pinata, tanstack-query…)
├── queries/       # GraphQL query documents
├── theme/         # MUI theme configuration
├── types/         # Shared TypeScript types
├── utils/         # Pure utility functions
└── validation/    # Zod schemas
```

---

## Networks

The active network is determined solely by `NEXT_PUBLIC_ENVIRONMENT`:

| Value                   | Chain            | Chain ID |
| ----------------------- | ---------------- | -------- |
| `development` (default) | Ethereum Sepolia | 11155111 |
| `production`            | Ethereum Mainnet | 1        |

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions covering Vercel, self-hosted Node.js, Docker, Nginx, CI/CD, and troubleshooting.
