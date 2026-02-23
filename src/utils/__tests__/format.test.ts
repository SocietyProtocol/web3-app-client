import { describe, it, expect } from "vitest";
import { formatExact, formatAuto } from "../format";

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

  it("formatAuto respects minDecimals option", () => {
    expect(formatAuto(1.2, { minDecimals: 3 })).toBe("1.200");
    expect(formatAuto(123456, { minDecimals: 2 })).toBe("123,456.00");
    expect(formatAuto(0, { minDecimals: 4 })).toBe("0");
  });

  it("formatAuto respects maxDecimals option", () => {
    expect(formatAuto(0.00012345, { maxDecimals: 6 })).toMatch(/0\.000123/);
    expect(formatAuto(1.2345, { minDecimals: 2, maxDecimals: 2 })).toBe("1.23");
    expect(formatAuto(12345.6789, { minDecimals: 2, maxDecimals: 2 })).toBe(
      "12,345.68",
    );
  });

  it("formatAuto with only maxDecimals adapts decimal places", () => {
    // Small numbers get more decimals, large numbers get fewer
    expect(formatAuto(0.00012345, { maxDecimals: 4 })).toMatch(/0\.0001/);
    expect(formatAuto(1.2345, { maxDecimals: 4 })).toBe("1.235");
    expect(formatAuto(123.456, { maxDecimals: 4 })).toBe("123.5");
  });

  it("formatAuto with only minDecimals ensures minimum decimal places", () => {
    expect(formatAuto(1, { minDecimals: 3 })).toBe("1.000");
    expect(formatAuto(5.1, { minDecimals: 2 })).toBe("5.10");
    expect(formatAuto(0.00012, { minDecimals: 2 })).toMatch(/0\.00012/);
  });

  it("formatAuto with no decimal options uses adaptive defaults", () => {
    expect(formatAuto(1.2345)).toBe("1.2345");
    expect(formatAuto(0.00012345)).toMatch(/0\.000123/);
    expect(formatAuto(123456.789)).toBe("123,457");
    expect(formatAuto(0.000001)).toBe("0.000001");
  });

  it("formatAuto works with combined minDecimals and maxDecimals", () => {
    expect(formatAuto(1.2, { minDecimals: 3, maxDecimals: 6 })).toBe("1.200");
    expect(formatAuto(0.0005, { minDecimals: 2, maxDecimals: 6 })).toMatch(
      /0\.0005/,
    );
    expect(formatAuto(-0.0043, { minDecimals: 4, maxDecimals: 6 })).toMatch(
      /\-0\.0043/,
    );
  });

  it("formatAuto uses compact notation when requested", () => {
    const result = formatAuto(1000000, { compact: true });
    expect(result).toMatch(/1M/);
    const result2 = formatAuto(1500, { compact: true });
    expect(result2).toMatch(/1\.5K/);
  });

  it("formatAuto handles non-finite values", () => {
    expect(formatAuto(Infinity)).toBe("Infinity");
    expect(formatAuto(-Infinity)).toBe("-Infinity");
    expect(formatAuto(NaN)).toBe("NaN");
    expect(formatAuto("not-a-number")).toBe("NaN");
  });

  it("formatAuto handles negative numbers", () => {
    expect(formatAuto(-1.2345, { minDecimals: 2, maxDecimals: 2 })).toBe(
      "-1.23",
    );
    expect(formatAuto(-0.00098765, { minDecimals: 5, maxDecimals: 5 })).toBe(
      "-0.00099",
    );
  });

  it("formatAuto handles large numbers", () => {
    expect(formatAuto(12345678, { maxDecimals: 6 })).toBe("12,345,678");
    expect(formatAuto(1000000000, { minDecimals: 2, maxDecimals: 6 })).toBe(
      "1,000,000,000.00",
    );
  });
});
