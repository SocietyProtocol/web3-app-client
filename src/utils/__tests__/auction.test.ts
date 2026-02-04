import { describe, it, expect } from "vitest";
import { encodeOrderId, decodeOrderId, subgraphOrderIdToHex } from "../auction";

describe("auction utils", () => {
  it("encodeOrderId produces 0x-prefixed hex of expected length", () => {
    const hex = encodeOrderId(BigInt(1), BigInt(2), BigInt(3));
    expect(typeof hex).toBe("string");
    expect(hex.startsWith("0x")).toBe(true);
    expect(hex.length).toBe(66); // 0x + 64 hex chars
  });

  it("decodeOrderId(dec(encode(...))) returns original values", () => {
    const userId = BigInt(123456789);
    const buyAmount = BigInt(9876543210123);
    const sellAmount = BigInt(5555555555555);

    const hex = encodeOrderId(userId, buyAmount, sellAmount);
    const decoded = decodeOrderId(hex);

    expect(decoded.userId).toBe(userId);
    expect(decoded.buyAmount).toBe(buyAmount);
    expect(decoded.sellAmount).toBe(sellAmount);
  });

  it("decodeOrderId parses a known hex string correctly", () => {
    const userHex = "0000000000000001";
    const buyHex = "000000000000000000000002";
    const sellHex = "000000000000000000000003";
    const hex = `0x${userHex}${buyHex}${sellHex}`;

    const decoded = decodeOrderId(hex);
    expect(decoded.userId).toBe(BigInt(1));
    expect(decoded.buyAmount).toBe(BigInt(2));
    expect(decoded.sellAmount).toBe(BigInt(3));
  });

  it("subgraphOrderIdToHex converts valid id and returns auctionId", () => {
    const input = "7-300-200-5"; // auctionId-sell-buy-user
    const { hexOrderId, auctionId } = subgraphOrderIdToHex(input);
    expect(auctionId).toBe(BigInt(7));

    const decoded = decodeOrderId(hexOrderId);
    expect(decoded.userId).toBe(BigInt(5));
    expect(decoded.buyAmount).toBe(BigInt(200));
    expect(decoded.sellAmount).toBe(BigInt(300));
  });

  it("subgraphOrderIdToHex throws on invalid format", () => {
    expect(() => subgraphOrderIdToHex("bad-format")).toThrow();
    expect(() => subgraphOrderIdToHex("1-2-3")).toThrow();
  });
});
