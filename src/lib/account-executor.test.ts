import { describe, expect, it, vi } from "vitest";
import {
  hasSendCallsCapability,
  submitAccountWrite,
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

describe("submitAccountWrite", () => {
  it("uses one normal transaction for an EOA wallet", async () => {
    const write = vi.fn(async () => "0x1111" as const);
    const send = vi.fn(async () => "0x2222" as const);

    await expect(
      submitAccountWrite({
        supportsSendCalls: false,
        write,
        send,
      }),
    ).resolves.toBe("0x1111");
    expect(write).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it("uses one wallet call batch for a contract wallet", async () => {
    const write = vi.fn(async () => "0x1111" as const);
    const send = vi.fn(async () => "0x2222" as const);

    await expect(
      submitAccountWrite({
        supportsSendCalls: true,
        write,
        send,
      }),
    ).resolves.toBe("0x2222");
    expect(send).toHaveBeenCalledOnce();
    expect(write).not.toHaveBeenCalled();
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
