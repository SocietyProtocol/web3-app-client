import { describe, it, expect } from "vitest";
import { formatExact, formatAuto, formatCompact } from "../format";

describe("format utils", () => {
  it("formatExact formats numbers and strings with fixed decimals", () => {
    expect(formatExact(1.2345, 2)).toBe("1.23");
    expect(formatExact("1000", 2)).toBe("1,000.00");
    expect(formatExact("not-a-number", 2)).toBe("NaN");
  });

  it('formatAuto returns "0" for zero values', () => {
    expect(formatAuto(0)).toBe("0");
    expect(formatAuto("0")).toBe("0");
  });

  it('formatAuto respects minThreshold and returns "< minThreshold" for tiny values', () => {
    const minThreshold = 0.000001;
    expect(formatAuto(0.00000045, { minThreshold })).toBe(`< ${minThreshold}`);
    // value above threshold prints a numeric string
    expect(formatAuto(0.0000023, { minThreshold })).toMatch(/0\.000002/);
  });

  it("formatAuto can trim trailing zeros when requested", () => {
    // With minDecimals set to 3 Intl will produce trailing zeros; trimTrailingZeros should remove them
    expect(formatAuto(1.2, { minDecimals: 3, trimTrailingZeros: true })).toBe(
      "1.2",
    );
  });

  it("formatCompact uses compact notation and returns a string containing unit", () => {
    const compact = formatCompact(1200, 1);
    expect(typeof compact).toBe("string");
    expect(
      compact.toUpperCase().includes("K") || compact.includes("1,200"),
    ).toBe(true);
  });

  it("formatCompact and formatAuto return stringified non-finite values", () => {
    expect(formatCompact("not-a-number", 2)).toBe("NaN");
    expect(formatAuto("not-a-number")).toBe("NaN");
  });
});
