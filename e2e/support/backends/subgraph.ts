import { URLS } from "../../env/hermetic";
import type { EntityTypes, OverlayOp } from "../builders/entities";

/**
 * Test-side client of the subgraph fake (e2e/support/backends/server.mjs).
 *
 * The fake answers the app's persisted queries from an entity store:
 *   - a recorded baseline of what is on the forked chain;
 *   - a chain follower that applies the badges contract's events from the
 *     local chain, so on-chain writes show up by themselves;
 *   - per-test overlays pushed from here, dropped before the next test.
 * `_meta.block.number` is the last block the follower applied.
 */
export type SubgraphFault =
  | { kind: "http-error"; status?: number; operation?: string; count?: number }
  | { kind: "graphql-error"; message?: string; operation?: string; count?: number }
  | { kind: "invalid-json"; operation?: string; count?: number }
  | { kind: "delay"; ms: number; operation?: string; count?: number };

export type SubgraphRequest = {
  operationName?: string;
  variables: Record<string, unknown>;
  authorized: boolean;
  at: number;
  /** The fake's own error messages for this request. The app replaces them with a generic one. */
  errors?: string[];
  /**
   * Set when the query gateway would have refused the request (its
   * variablePolicy or its persisted documents, e2e/support/backends/gateway):
   * the fake answered with this status and message, like the gateway does.
   */
  refused?: { status: number; message: string };
};

/**
 * The fake answers its control calls in milliseconds. One that takes this
 * long is stuck, and the test should say so by name instead of running into
 * its own timeout with nothing to show.
 */
const CONTROL_TIMEOUT_MS = 60_000;

async function control<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${URLS.subgraph}/__control/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(CONTROL_TIMEOUT_MS),
  }).catch((error: unknown) => {
    throw new Error(`subgraph fake: ${path} got no answer (${error instanceof Error ? error.message : String(error)})`, {
      cause: error,
    });
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(`subgraph fake: ${path} failed with ${response.status}: ${payload.error ?? "unknown error"}`);
  }
  return payload;
}

export class SubgraphFake {
  /** Drops overlays, faults, the _meta lag and the request log. Runs before every test. */
  async reset() {
    await control("reset", {});
  }

  /** Adds entities or changes on top of the baseline for the rest of this test. */
  async overlay(...ops: (OverlayOp | OverlayOp[])[]) {
    await control("overlay", { ops: ops.flat() });
  }

  /**
   * Makes the next matching requests fail or stall. `operation` is a
   * persisted query name such as "User". A fault applies to `count`
   * requests and then ends; without `count` that is ONE request. The app's
   * queries retry a failed request three times, so a fault that should
   * end in an error state needs a count above four.
   */
  async injectFaults(...faults: SubgraphFault[]) {
    await control("faults", { faults });
  }

  /** Ends every injected fault. Overlays, the _meta lag and the request log stay as they are. */
  async clearFaults() {
    await control("faults", { clear: true, faults: [] });
  }

  /**
   * Controls how far behind the chain the fake is.
   *
   * `lagBlocks` keeps `_meta.block.number` that many blocks behind the
   * chain; `freeze: true` pins it at the current block, so the app's "wait
   * for the subgraph" never completes until unfreeze(). Both change only
   * `_meta`: the entities still follow the chain, so a query made after the
   * app gives up waiting already sees the write.
   *
   * `stall: true` stops indexing altogether, like a real subgraph that has
   * fallen behind: `_meta` and the entities stay at the current block until
   * unfreeze() (or the next test). `sync()`, `entity()` and `entities()`
   * then also report the old state.
   */
  async setMeta(options: { lagBlocks?: number; freeze?: boolean; stall?: boolean }) {
    await control("meta", options);
  }

  /** Ends a lag, a freeze or a stall, and applies what the chain did meanwhile. */
  async unfreeze() {
    await control("meta", {});
  }

  /** Applies everything on chain so far and returns the block the fake reports. */
  async sync(): Promise<number> {
    return (await control<{ reportedBlock: number }>("sync", {})).reportedBlock;
  }

  /** The GraphQL requests the app's server sent since the last reset. */
  async requests(): Promise<SubgraphRequest[]> {
    return (await control<{ requests: SubgraphRequest[] }>("requests")).requests;
  }

  /** The entity as queries see it now (baseline, chain follower and overlays), or null. */
  async entity<K extends keyof EntityTypes>(type: K, id: string): Promise<EntityTypes[K] | null> {
    const query = new URLSearchParams({ type, id: id.startsWith("0x") ? id.toLowerCase() : id });
    return (await control<{ entity: EntityTypes[K] | null }>(`entity?${query}`)).entity;
  }

  async entities<K extends keyof EntityTypes>(type: K): Promise<EntityTypes[K][]> {
    return (await control<{ entities: EntityTypes[K][] }>(`entities?type=${type}`)).entities;
  }

  /** Addresses of the users whose `badges` include the badge, as the fake knows them. */
  async holdersOf(badgeId: string | bigint): Promise<string[]> {
    const id = String(badgeId);
    return (await this.entities("User")).filter((user) => user.badges.includes(id)).map((user) => user.id);
  }

  async state(): Promise<{ cursor: number; reportedBlock: number; forkBlock: number; counts: Record<string, number> }> {
    return control("state");
  }
}
