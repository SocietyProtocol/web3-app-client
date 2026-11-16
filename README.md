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
| IPFS      | Filebase S3 (`@aws-sdk/client-s3`)        |
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
| `GRAPH_QUERY_GATEWAY_URL`           | ✅       | Server-only protected Graph query gateway; browser traffic uses `/api/graphql`                                                | AWS query gateway on the outpost Docker network                                      |
| `GRAPH_QUERY_GATEWAY_TOKEN`         | ✅       | Server-only credential for the protected Graph query gateway                                                                  | Outpost env file, mode 600                                     |
| `FILEBASE_KEY`                      | ✅       | Filebase S3 access key for **server-side** IPFS pins — never exposed to the browser                                                                        | [filebase.com](https://filebase.com)                        |
| `FILEBASE_SECRET`                   | ✅       | Filebase S3 secret key                                                                                                                                     | [filebase.com](https://filebase.com)                        |
| `FILEBASE_BUCKET`                   | ✅       | Filebase IPFS bucket name (use a dedicated outpost bucket or an `outpost/` prefix)                                                                         | [filebase.com](https://filebase.com)                        |
| `NEXT_PUBLIC_SNAPSHOT_URL`          | ✅       | Snapshot governance space URL                                                                                                                              | [snapshot.box](https://snapshot.box/)                       |
| `NEXT_PUBLIC_SNAPSHOT_SPEC_URL`     | ✅       | Snapshot space URL for the SPEC expression-of-feedback votes (parallel to the main governance space)                                                       | [snapshot.box](https://snapshot.box/)                       |
| `NEXT_PUBLIC_AUCTION_ID`            | —        | ID of the auction to interact with                                                                                                                         | Smart contract deployment                                   |
| `NEXT_PUBLIC_HERO_VIDEO_URL`        | —        | Public URL of the "Web3 Outpost" video shown on the home hero. When unset the previous Welcome card is rendered instead.                                   | Vercel Blob dashboard                                       |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | —        | PostHog project token used to enable client-side analytics, pageviews, and event tracking                                                                  | Your PostHog project settings                               |
| `NEXT_PUBLIC_POSTHOG_HOST`          | —        | PostHog ingest host override, typically `https://us.i.posthog.com` or `https://eu.i.posthog.com`; leave unset to use the SDK default                       | Your PostHog deployment or region                           |

> **Note:** Variables prefixed with `NEXT_PUBLIC_` are embedded in the client bundle. Never place secrets (e.g. `FILEBASE_SECRET` or `GRAPH_QUERY_GATEWAY_TOKEN`) in a `NEXT_PUBLIC_` variable. PostHog analytics remain disabled unless `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is set.

### 3. Install & Run

```bash
# Install dependencies
yarn install

# Start the development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Available Scripts

| Script            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `yarn dev`        | Explicit GraphQL code-gen + Next.js dev server with hot reload |
| `yarn build`      | Explicit GraphQL code-gen + production build                   |
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
├── lib/           # Library setup (wagmi, env, filebase, tanstack-query…)
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

## Who pays for gas

A wallet's identity in the Outpost is its Light Account (a smart account the wallet owns). Contract wallets such as a Safe act as themselves.

| Route                   | Who the contracts see | Who pays                    | When                                                                                             |
| ----------------------- | --------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `sponsored`             | Light Account         | Society (Pimlico paymaster) | `createProfile`, `updateProfileURI`, `acceptInvite`                                              |
| `owner-through-account` | Light Account         | The connected wallet        | Any other Outpost call the Light Account can make, and a sponsored call when free gas is unavailable |
| `owner`                 | The connected wallet  | The connected wallet        | Calls only the wallet itself may make, contract wallets, and non-Outpost contracts (auction, lock) |

`owner-through-account` is a normal transaction from the wallet to its Light Account's `execute(target, 0, data)`. If the Light Account is not deployed yet, the wallet first sends `LightAccountFactory.createAccount(owner, 0)`, then `execute`.

When Society cannot sponsor a call (policy exhausted, a rate or daily limit on `/api/aa/rpc`, the proxy not configured, a paymaster or bundler error before the signature), the app says free gas is unavailable, shows the estimated fee and sends the call `owner-through-account`. It does not fall back when the call itself would revert or the user rejects it.

The Light Account never pays and never needs ETH: the app does not ask anyone to send ETH to it. Logic: `src/lib/outpost-routing.ts`, `src/lib/outpost-send.ts`, `src/lib/owner-pays.ts`.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions covering Vercel, self-hosted Node.js, Docker, Nginx, CI/CD, and troubleshooting.
