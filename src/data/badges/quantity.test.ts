import { describe, expect, it } from "vitest";
import {
  formatBadgeCount,
  formatPercent,
  formatVotingPower,
  votingPowerPercent,
} from "./quantity";

describe("formatBadgeCount", () => {
  it("shows count over total", () => {
    expect(formatBadgeCount(BigInt(10), BigInt(15))).toBe("10 / 15");
    expect(formatBadgeCount(2, 15)).toBe("2 / 15");
  });

  it("shows only the count while the total is unknown", () => {
    expect(formatBadgeCount(BigInt(2))).toBe("2");
  });
});

describe("votingPowerPercent", () => {
  it("computes the share of the total supply", () => {
    expect(votingPowerPercent(BigInt(10), BigInt(15))).toBe(66.67);
    expect(votingPowerPercent(BigInt(1), BigInt(15))).toBe(6.67);
    expect(votingPowerPercent(BigInt(15), BigInt(15))).toBe(100);
  });

  it("is undefined for a zero or unknown total", () => {
    expect(votingPowerPercent(BigInt(1), BigInt(0))).toBeUndefined();
    expect(votingPowerPercent(BigInt(1))).toBeUndefined();
  });

  it("is zero for a holder with no badges", () => {
    expect(votingPowerPercent(BigInt(0), BigInt(15))).toBe(0);
  });
});

describe("formatPercent", () => {
  it("trims trailing zeros", () => {
    expect(formatPercent(50)).toBe("50%");
    expect(formatPercent(66.67)).toBe("66.67%");
  });
});

describe("formatVotingPower", () => {
  it("combines fraction and percentage", () => {
    expect(formatVotingPower(BigInt(2), BigInt(15))).toBe("2 / 15 · 13.33%");
  });

  it("falls back to the fraction when no percentage exists", () => {
    expect(formatVotingPower(BigInt(2), BigInt(0))).toBe("2 / 0");
    expect(formatVotingPower(BigInt(2))).toBe("2");
  });
});
