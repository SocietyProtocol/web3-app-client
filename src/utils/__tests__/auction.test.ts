import { describe, it, expect } from "vitest";
import { encodeOrderId, subgraphOrderIdToHex } from "../auction";

describe("auction utils", () => {
  it("encodeOrderId produces 0x-prefixed hex of expected length", () => {
    const hex = encodeOrderId(BigInt(1), BigInt(2), BigInt(3));
    expect(typeof hex).toBe("string");
    expect(hex.startsWith("0x")).toBe(true);
    expect(hex.length).toBe(66); // 0x + 64 hex chars
  });

  it("subgraphOrderIdToHex converts valid id and returns auctionId", () => {
    const input = "7-300-200-5"; // auctionId-sell-buy-user
    const { hexOrderId, auctionId } = subgraphOrderIdToHex(input);
    expect(auctionId).toBe(BigInt(7));

    const expectedHex = encodeOrderId(BigInt(5), BigInt(200), BigInt(300));
    expect(hexOrderId).toBe(expectedHex);
  });

  it("subgraphOrderIdToHex throws on invalid format", () => {
    expect(() => subgraphOrderIdToHex("bad-format")).toThrow();
    expect(() => subgraphOrderIdToHex("1-2-3")).toThrow();
  });
});
