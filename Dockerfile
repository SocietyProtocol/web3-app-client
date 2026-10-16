FROM node:22-bookworm-slim

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
RUN yarn config set network-timeout 600000 \
  && ok=0 \
  && for i in 1 2 3 4 5; do \
       if yarn install --frozen-lockfile --network-timeout 600000; then ok=1; break; fi; \
       echo "yarn install retry ${i}"; \
       sleep 20; \
     done \
  && test "$ok" = 1

COPY . .
COPY .env.production .env.production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
# graphclient build reads the process environment. Next loads .env.production
# on its own, so the graph endpoint was baked as null and the accounts query
# crashed while interpolating that URL.
RUN node --input-type=module -e 'import { readFileSync } from "node:fs"; import { spawnSync } from "node:child_process"; const text = readFileSync(".env.production","utf8"); for (const line of text.split(/\n/)) { if (!line || line.startsWith("#")) continue; const eq = line.indexOf("="); if (eq < 1) continue; const key = line.slice(0, eq); let value = line.slice(eq + 1); if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'\''") && value.endsWith("'\''"))) value = value.slice(1, -1); process.env[key] = value; } if (!process.env.NEXT_PUBLIC_GRAPH_URL) { console.error("NEXT_PUBLIC_GRAPH_URL missing"); process.exit(1); } const result = spawnSync("yarn", ["build"], { stdio: "inherit", env: process.env }); process.exit(result.status ?? 1);'

EXPOSE 3000
CMD ["yarn", "start"]
