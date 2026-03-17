# Deployment Guide — Society Protocol Client

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [External Service Setup](#3-external-service-setup)
4. [Local / Development Build](#4-local--development-build)
5. [Production Build](#5-production-build)
6. [Deploy on Vercel](#6-deploy-on-vercel)
7. [Deploy on a Self-Hosted Server](#7-deploy-on-a-self-hosted-server)
8. [Docker Deployment](#8-docker-deployment)
9. [Network Configuration](#9-network-configuration)
10. [GraphQL Client Code-Gen](#10-graphql-client-code-gen)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

| Requirement             | Minimum Version    |
| ----------------------- | ------------------ |
| Node.js                 | 18.x LTS or later  |
| npm / yarn / pnpm / bun | latest stable      |
| Git                     | any recent version |

Verify your Node.js version:

```bash
node --version
```

---

## 2. Environment Variables

Copy the example file and fill in the required values:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable                         | Description                                                                                                           | Example                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_ENVIRONMENT`        | Runtime environment — controls which chain is used (`development` → Sepolia, `production` → Mainnet)                  | `production`                                |
| `NEXT_PUBLIC_WC_PROJECT_ID`      | WalletConnect project ID for wallet connection                                                                        | `abc123...`                                 |
| `NEXT_PUBLIC_ALCHEMY_API_KEY`    | Alchemy API key for Ethereum JSON-RPC                                                                                 | `abc123...`                                 |
| `NEXT_PUBLIC_GRAPH_URL`          | Subgraph URL for the **active** network (Sepolia in development/staging, Mainnet in production); used by code-gen too | `https://api.studio.thegraph.com/query/...` |
| `NEXT_PUBLIC_PINATA_GATEWAY_URL` | Pinata IPFS gateway URL                                                                                               | `https://your-gateway.mypinata.cloud`       |
| `PINATA_JWT`                     | Pinata JWT for **server-side** IPFS uploads (never exposed to the browser)                                            | `eyJhb...`                                  |
| `NEXT_PUBLIC_SNAPSHOT_URL`       | Snapshot governance space URL                                                                                         | `https://snapshot.box/#/s:your-space.eth`   |

### Optional Variables

| Variable                 | Description                                 | Example |
| ------------------------ | ------------------------------------------- | ------- |
| `NEXT_PUBLIC_AUCTION_ID` | ID of the specific auction to interact with | `1`     |

> **Security note:** Variables prefixed with `NEXT_PUBLIC_` are embedded in the client bundle and visible to end-users. Never put secrets (e.g., `PINATA_JWT`) in a `NEXT_PUBLIC_` variable.

---

## 3. External Service Setup

### 3.1 WalletConnect

1. Go to [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/) and create a new project.
2. Copy the **Project ID** and set it as `NEXT_PUBLIC_WC_PROJECT_ID`.

### 3.2 Alchemy

1. Go to [https://www.alchemy.com/](https://www.alchemy.com/) and create an app for **Ethereum Mainnet** (and optionally **Ethereum Sepolia** for staging).
2. Copy the **API Key** and set it as `NEXT_PUBLIC_ALCHEMY_API_KEY`.
   - The app uses Alchemy for both Mainnet and Sepolia RPC endpoints automatically based on the `NEXT_PUBLIC_ENVIRONMENT` value.

### 3.3 Pinata (IPFS)

1. Go to [https://pinata.cloud/](https://pinata.cloud/) and create an account.
2. Generate an **API Key** with pinning permissions → copy the **JWT**.
3. Set it as `PINATA_JWT`.
4. In **Gateways**, create a dedicated gateway (or use the default) and set its URL as `NEXT_PUBLIC_PINATA_GATEWAY_URL`.

### 3.4 The Graph — Subgraph Endpoints

The application uses a **single unified subgraph per network** (badges and auction data are indexed together) and a **single env var name** to point to it in each deployment:

| Network              | Env var                 | Example subgraph name |
| -------------------- | ----------------------- | --------------------- |
| Sepolia (staging)    | `NEXT_PUBLIC_GRAPH_URL` | `society-testnet`     |
| Mainnet (production) | `NEXT_PUBLIC_GRAPH_URL` | `society-mainnet`     |

- Deploy your Sepolia and Mainnet subgraphs separately to [The Graph Studio](https://thegraph.com/studio/) and copy the **network-specific** query URL for each.
- For a Sepolia deployment, set `NEXT_PUBLIC_GRAPH_URL` to the Sepolia subgraph query URL; for a Mainnet deployment, set it to the Mainnet subgraph query URL. A single URL **cannot** serve both networks at once.
- `NEXT_PUBLIC_GRAPH_URL` is consumed by GraphQL code-gen (`graphclient build`) at build time and by the runtime client in the corresponding deployment environment.

### 3.5 Snapshot (Governance)

1. Create a Snapshot space at [https://snapshot.box/](https://snapshot.box/).
2. Set `NEXT_PUBLIC_SNAPSHOT_URL` to the full URL of your space (e.g., `https://snapshot.box/#/s:your-space.eth`).

---

## 4. Local / Development Build

```bash
# Install dependencies (also runs graphclient build via postinstall)
npm install

# Start the dev server with hot reload
npm run dev
```

The app is served at [http://localhost:3000](http://localhost:3000).

> With `NEXT_PUBLIC_ENVIRONMENT=development` the app connects to **Ethereum Sepolia**.

---

## 5. Production Build

```bash
# 1. Install dependencies
npm install

# 2. Build (runs graphclient code-gen + Next.js build)
npm run build

# 3. Start the production server
npm start
```

The production server starts on port **3000** by default. To use a different port:

```bash
npm start -- --port 8080
```

> With `NEXT_PUBLIC_ENVIRONMENT=production` the app connects to **Ethereum Mainnet**.

---

## 6. Deploy on Vercel

Vercel is the recommended platform for Next.js 16 deployments.

### 6.1 One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/protofire/society-protocol-client)

### 6.2 Manual Steps

1. Push your code to GitHub/GitLab/Bitbucket.
2. Go to [https://vercel.com/new](https://vercel.com/new) and import the repository.
3. In **Environment Variables**, add all variables listed in [Section 2](#2-environment-variables).
4. Leave the **Build Command** and **Output Directory** at their defaults (`npm run build` / `.next`).
5. Click **Deploy**.

### 6.3 Branch-Based Environments

| Branch          | Environment Variable                  | Network |
| --------------- | ------------------------------------- | ------- |
| `main`          | `NEXT_PUBLIC_ENVIRONMENT=production`  | Mainnet |
| `staging` / PRs | `NEXT_PUBLIC_ENVIRONMENT=development` | Sepolia |

Use Vercel's **Environment Variable scoping** (Production / Preview / Development) to set different values per branch automatically.

---

## 7. Deploy on a Self-Hosted Server

### 7.1 Node.js Standalone

```bash
# On the server
git clone https://github.com/protofire/society-protocol-client.git
cd society-protocol-client

# Create and populate environment file
cp .env.example .env.local
nano .env.local    # fill in all required values

npm install
npm run build
npm start          # runs on port 3000
```

Use a process manager like **PM2** to keep the server alive:

```bash
npm install -g pm2
pm2 start "npm start" --name society-protocol-client
pm2 save
pm2 startup
```

### 7.2 Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

For HTTPS, use [Certbot](https://certbot.eff.org/):

```bash
sudo certbot --nginx -d your-domain.com
```

---

## 8. Docker Deployment

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args become env vars at build time
ARG NEXT_PUBLIC_ENVIRONMENT
ARG NEXT_PUBLIC_WC_PROJECT_ID
ARG NEXT_PUBLIC_ALCHEMY_API_KEY
ARG NEXT_PUBLIC_GRAPH_URL
ARG NEXT_PUBLIC_PINATA_GATEWAY_URL
ARG NEXT_PUBLIC_SNAPSHOT_URL
ARG NEXT_PUBLIC_AUCTION_ID

RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

> **Note:** Add `output: 'standalone'` to [next.config.ts](next.config.ts) to enable standalone output mode required by the Docker runner stage above.

Build and run:

```bash
docker build \
  --build-arg NEXT_PUBLIC_ENVIRONMENT=production \
  --build-arg NEXT_PUBLIC_WC_PROJECT_ID=xxx \
  --build-arg NEXT_PUBLIC_ALCHEMY_API_KEY=xxx \
  --build-arg NEXT_PUBLIC_GRAPH_URL=xxx \
  --build-arg NEXT_PUBLIC_PINATA_GATEWAY_URL=xxx \
  --build-arg NEXT_PUBLIC_SNAPSHOT_URL=xxx \
  -t society-protocol-client .

docker run -p 3000:3000 \
  -e PINATA_JWT=your_pinata_jwt \
  society-protocol-client
```

---

## 9. Network Configuration

The active network is determined **solely** by the `NEXT_PUBLIC_ENVIRONMENT` variable:

| Value                                   | Chain                                | Smart Contracts                                        |
| --------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `development` (anything ≠ `production`) | Ethereum Sepolia (chainId: 11155111) | See [src/consts/contracts.ts](src/consts/contracts.ts) |
| `production`                            | Ethereum Mainnet (chainId: 1)        | See [src/consts/contracts.ts](src/consts/contracts.ts) |

### Contract Addresses

| Contract       | Sepolia                                      | Mainnet                                      |
| -------------- | -------------------------------------------- | -------------------------------------------- |
| Badges         | `0x76Aa1B43a651acc4320a4610af896ddfe38B428a` | _(pending deployment)_                       |
| Auction        | `0x96aa924EF625bd8eF4A2C4d369408d1491453Ec5` | `0x0b7fFc1f4AD541A4Ed16b40D8c37f0929158D101` |
| Chainlink Feed | `0x694AA1769357215DE4FAC081bf1f309aDC325306` | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |

To update contract addresses, edit [src/consts/contracts.ts](src/consts/contracts.ts).

---

## 10. GraphQL Client Code-Gen

This project uses `@graphprotocol/client-cli` to generate a typed GraphQL client from the subgraph schema. The code-gen runs automatically as part of the build:

```bash
# Runs automatically on `npm install` (postinstall) and `npm run build`
npm run codegen
```

**Requirements before running code-gen:**

- `NEXT_PUBLIC_GRAPH_URL` must be set and the subgraph endpoint must be reachable.

The configuration is in [.graphclientrc.yml](.graphclientrc.yml). GraphQL queries are located in [src/queries/](src/queries/).

---

## 11. CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_ENVIRONMENT: production
          NEXT_PUBLIC_WC_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_WC_PROJECT_ID }}
          NEXT_PUBLIC_ALCHEMY_API_KEY: ${{ secrets.NEXT_PUBLIC_ALCHEMY_API_KEY }}
          NEXT_PUBLIC_GRAPH_URL: ${{ secrets.NEXT_PUBLIC_GRAPH_URL }}
          NEXT_PUBLIC_PINATA_GATEWAY_URL: ${{ secrets.NEXT_PUBLIC_PINATA_GATEWAY_URL }}
          NEXT_PUBLIC_SNAPSHOT_URL: ${{ secrets.NEXT_PUBLIC_SNAPSHOT_URL }}
```

Store sensitive values (including `PINATA_JWT`) as **GitHub Actions Secrets** and inject them only at runtime, not at build time.

---

## 12. Troubleshooting

### Build fails with "environment variable is not set"

All required `NEXT_PUBLIC_*` variables must be present **at build time**. Ensure they are set in your CI environment or `.env.local` before running `npm run build`.

### GraphQL code-gen fails

- Check that `NEXT_PUBLIC_GRAPH_URL` is set and the subgraph endpoint responds.
- Verify the subgraph is fully indexed (check The Graph Studio dashboard).
- Run `npm run codegen` manually to see the full error.

### Wallet connection does not work

- Verify `NEXT_PUBLIC_WC_PROJECT_ID` is correct.
- Ensure the app domain is added to the **Allowed Domains** list in the WalletConnect Cloud dashboard.

### IPFS uploads fail

- Check that `PINATA_JWT` is valid and has **pinning** permissions.
- Confirm the `NEXT_PUBLIC_PINATA_GATEWAY_URL` matches the gateway configured in your Pinata account.

### Wrong network errors

- Set `NEXT_PUBLIC_ENVIRONMENT=production` to target Mainnet, or any other value for Sepolia.
- Users will be prompted to switch networks automatically if they are on the wrong chain.

### Port already in use

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```
