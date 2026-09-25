import { describe, expect, it, vi } from "vitest";
import {
  EIP1271_MAGIC,
  isContractWalletSignature,
} from "./contract-signature";

const payload = {
  address: "0x0000000000000000000000000000000000000001",
  message: "sign",
  signature: "0x1234" as const,
};

describe("isContractWalletSignature", () => {
  it("does not read a signature for an EOA", async () => {
    const readContract = vi.fn();
    const ok = await isContractWalletSignature(payload, {
      getCode: async () => "0x",
      readContract,
    } as Parameters<typeof isContractWalletSignature>[1]);
    expect(ok).toBe(false);
    expect(readContract).not.toHaveBeenCalled();
  });

  it("accepts a contract wallet only when EIP-1271 returns the magic value", async () => {
    const readContract = vi.fn(async () => EIP1271_MAGIC as `0x${string}`);
    const ok = await isContractWalletSignature(payload, {
      getCode: async () => "0x60016000",
      readContract,
    } as Parameters<typeof isContractWalletSignature>[1]);
    expect(ok).toBe(true);
    expect(readContract).toHaveBeenCalledOnce();
  });

  it("rejects a contract wallet with a bad signature and does not look up owners", async () => {
    const ok = await isContractWalletSignature(payload, {
      getCode: async () => "0x60016000",
      readContract: async () => "0x00000000" as `0x${string}`,
    });
    expect(ok).toBe(false);
  });
});
