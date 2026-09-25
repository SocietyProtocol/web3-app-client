import { describe, expect, it } from "vitest";
import {
  hasSendCallsCapability,
  waitForCallTransactionHash,
} from "./account-capabilities";

describe("hasSendCallsCapability", () => {
  it("is true only when this chain advertises atomic batch", () => {
    expect(
      hasSendCallsCapability(
        { 1: { atomicBatch: { status: "supported" } } },
        1,
      ),
    ).toBe(true);
    expect(
      hasSendCallsCapability({ 1: { atomic: { status: "ready" } } }, 1),
    ).toBe(true);
    expect(
      hasSendCallsCapability(
        { 1: { atomicBatch: { status: "unsupported" } } },
        1,
      ),
    ).toBe(false);
    expect(hasSendCallsCapability({ 1: { atomicBatch: { status: "ready" } } }, 11155111)).toBe(
      false,
    );
  });
});

describe("waitForCallTransactionHash", () => {
  it("returns the chain hash when the wallet reports success", async () => {
    const hash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    let calls = 0;
    const result = await waitForCallTransactionHash(
      async () => {
        calls += 1;
        if (calls === 1) return { status: "pending" };
        return { status: "success", receipts: [{ transactionHash: hash }] };
      },
      { intervalMs: 0, timeoutMs: 1000 },
    );
    expect(result).toBe(hash);
  });

  it("stops when the wallet reports failure", async () => {
    await expect(
      waitForCallTransactionHash(async () => ({ status: "failure" }), {
        intervalMs: 0,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow("Wallet call failed");
  });
});
