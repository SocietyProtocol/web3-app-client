import { afterEach, describe, expect, it, vi } from "vitest";
import type { Hex } from "viem";

vi.mock("../../.graphclient", () => ({
  StatusDocument: { kind: "Document" },
  execute: vi.fn(),
}));

import { e2ePollMs, e2ePollingOption, pollMs } from "@/lib/e2e-timing";
import { waitForCallTransactionHash } from "@/lib/account-capabilities";
import { defaultSyncInterval } from "@/hooks/useWaitForSubgraphSync";

/** `marker` is NEXT_PUBLIC_E2E_BUILD, the mark of the suite's own build. */
type Mode = { value?: string; environment?: string; marker?: string };

function stub({ value, environment, marker }: Mode) {
  vi.stubEnv("NEXT_PUBLIC_E2E_POLL_MS", value ?? "");
  vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", environment ?? "");
  vi.stubEnv("NEXT_PUBLIC_E2E_BUILD", marker ?? "");
}

/** The suite's own build with this value. */
function e2eBuild(value: string): Mode {
  return { value, environment: "development", marker: "1" };
}

/** Every way the value can be absent, malformed or locked out. */
const IGNORED: Array<[string, Mode]> = [
  ["it is unset", { environment: "development", marker: "1" }],
  ["it is unset and the environment is unset", {}],
  ["it is unset in production", { environment: "production" }],
  ["the environment is production", { value: "200", environment: "production", marker: "1" }],
  ["the environment is staging", { value: "200", environment: "staging", marker: "1" }],
  ["the environment is unset", { value: "200", marker: "1" }],
  // A deployed staging bundle that got the value by mistake: staging is
  // built as "development", but never with the build marker.
  ["the build marker is absent", { value: "200", environment: "development" }],
  ["the build marker is not exactly 1", { value: "200", environment: "development", marker: "yes" }],
  ["it is not a number", e2eBuild("fast")],
  ["it is zero", e2eBuild("0")],
  ["it is negative", e2eBuild("-200")],
  ["it is a fraction", e2eBuild("0.5")],
  ["it has a unit", e2eBuild("200ms")],
  ["it is below 50 ms", e2eBuild("49")],
  ["it is above one second", e2eBuild("1001")],
];

const HONOURED: Array<[string, Mode]> = [["the suite's build", e2eBuild("200")]];

const HASH = `0x${"a".repeat(64)}` as Hex;

/** How long waitForCallTransactionHash waits between two reads of the status. */
async function callStatusInterval(): Promise<number> {
  vi.useFakeTimers();
  try {
    const readAt: number[] = [];
    const started = Date.now();
    const pending = waitForCallTransactionHash(async () => {
      readAt.push(Date.now() - started);
      return readAt.length === 1
        ? { status: "pending" as const }
        : { status: "success" as const, receipts: [{ transactionHash: HASH }] };
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await pending).toBe(HASH);
    expect(readAt).toHaveLength(2);
    return readAt[1] - readAt[0];
  } finally {
    vi.useRealTimers();
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("without the e2e interval", () => {
  it.each(IGNORED)("nothing is overridden when %s", (_, mode) => {
    stub(mode);
    expect(e2ePollMs()).toBeUndefined();
    // Callers keep their own interval, whatever it is.
    expect(pollMs(3_000)).toBe(3_000);
    expect(pollMs(1_000, { floor: 500 })).toBe(1_000);
    expect(pollMs(120)).toBe(120);
    // Nothing is added to a wagmi or viem client config, so the library's
    // own default polling interval applies.
    expect(e2ePollingOption()).toEqual({});
    expect("pollingInterval" in e2ePollingOption()).toBe(false);
  });

  it.each(IGNORED)("the subgraph is polled every second when %s", (_, mode) => {
    stub(mode);
    expect(defaultSyncInterval()).toBe(1_000);
  });

  it.each(IGNORED)("a wallet call's status is read every three seconds when %s", async (_, mode) => {
    stub(mode);
    expect(await callStatusInterval()).toBe(3_000);
  });
});

describe("with the e2e interval", () => {
  it.each(HONOURED)("waits are shortened in %s", async (_, mode) => {
    stub(mode);
    expect(e2ePollMs()).toBe(200);
    expect(pollMs(3_000)).toBe(200);
    expect(e2ePollingOption()).toEqual({ pollingInterval: 200 });
    expect(await callStatusInterval()).toBe(200);
  });

  it("never lengthens a wait", () => {
    stub(e2eBuild("1000"));
    expect(pollMs(120)).toBe(120);
    expect(pollMs(120, { floor: 500 })).toBe(120);
  });

  it("keeps the subgraph poll at or above half a second, under the route's rate limit", () => {
    stub(e2eBuild("50"));
    expect(defaultSyncInterval()).toBe(500);
    stub(e2eBuild("800"));
    expect(defaultSyncInterval()).toBe(800);
  });

  it("accepts the bounds", () => {
    stub(e2eBuild("50"));
    expect(e2ePollMs()).toBe(50);
    stub(e2eBuild("1000"));
    expect(e2ePollMs()).toBe(1_000);
  });
});
