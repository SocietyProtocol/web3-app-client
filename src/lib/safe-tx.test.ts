import { describe, expect, it, vi } from "vitest";
import { resolveExecutedTransactionHash } from "./safe-tx";

describe("resolveExecutedTransactionHash", () => {
  it("returns the original hash when Safe has no such transaction", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const hash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    await expect(
      resolveExecutedTransactionHash(hash, 1, fetchImpl),
    ).resolves.toBe(hash);
  });

  it("waits until a Safe transaction is executed and returns the chain hash", async () => {
    const hash = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const chainHash =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ isExecuted: false }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            isExecuted: true,
            isSuccessful: true,
            transactionHash: chainHash,
          }),
          { status: 200 },
        ),
      );

    await expect(
      resolveExecutedTransactionHash(hash, 1, fetchImpl),
    ).resolves.toBe(chainHash);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
