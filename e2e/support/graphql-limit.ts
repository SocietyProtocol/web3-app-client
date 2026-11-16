import type { APIRequestContext, Page } from "@playwright/test";

/**
 * The /api/graphql rate limit (src/app/api/graphql/route.ts): a token
 * bucket per visitor IP that holds sixty requests and refills one a second
 * (sixty a minute). The visitor is the Cloudflare visitor IP
 * (`cf-connecting-ip`, see clientIp in src/lib/aa/rate-limit.ts), not the
 * x-forwarded-for hop. Every test has its own IP in both headers (`testIp`).
 */
export const GRAPHQL_BURST = 60;
export const GRAPHQL_REFILL_MS = 1_000;

/**
 * A request that the route refuses with 415 right after the rate-limit
 * check: it takes a token like any other, and never reaches the subgraph.
 */
export function cheapGraphqlRequest(api: APIRequestContext, headers: Record<string, string> = {}) {
  return api.post("/api/graphql", { headers: { "content-type": "text/plain", ...headers }, data: "x" });
}

/**
 * Sends cheap requests as the visitor `headers` names (the `api` context's
 * own IP when empty) until one is refused with 429, and says how many were
 * served before it and how long that took. Every answer before the 429 must
 * be the 415 of a served request.
 */
export async function useUpGraphqlAllowance(api: APIRequestContext, headers: Record<string, string> = {}) {
  const started = Date.now();
  // The bucket refills while the loop runs, so a slow machine is served a
  // few more than sixty; twice that is far more than any loop can earn.
  for (let served = 0; served <= 2 * GRAPHQL_BURST; served += 1) {
    const response = await cheapGraphqlRequest(api, headers);
    if (response.status() === 429) return { served, elapsedMs: Date.now() - started, refused: response };
    if (response.status() !== 415) {
      throw new Error(`request ${served + 1} was answered ${response.status()}, not 415 or 429`);
    }
  }
  throw new Error(`/api/graphql served ${2 * GRAPHQL_BURST + 1} requests without a 429`);
}

/** The most requests a bucket can serve in a row that took `elapsedMs`: the burst and what refilled meanwhile. */
export function mostServedIn(elapsedMs: number) {
  return GRAPHQL_BURST + Math.ceil(elapsedMs / GRAPHQL_REFILL_MS);
}

/**
 * Records the status of every /api/graphql answer the page gets, from now
 * on. `refused()` lists the 429s.
 */
export function watchGraphqlAnswers(page: Page) {
  const statuses: number[] = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/graphql") statuses.push(response.status());
  });
  return {
    statuses: () => [...statuses],
    refused: () => statuses.filter((status) => status === 429).length,
    served: () => statuses.filter((status) => status === 200).length,
  };
}

/**
 * Another visitor next to `ip` (the last number changed). Test IPs are
 * spread over 10.0.0.0/8 by a hash, so no other test of the run has it.
 */
export function neighbourOf(ip: string) {
  const parts = ip.split(".");
  parts[3] = String(1 + (Number(parts[3]) % 254));
  return parts.join(".");
}
