import { describe, it, expect } from "vitest";
import { scaleUp, scaleDown, min } from "../bigint";

describe("bigint utils", () => {
  it("scaleUp multiplies value by 10^decimals", () => {
    const value = BigInt(123);
    const scaled = scaleUp(value, 2);
    expect(scaled).toBe(BigInt(12300));
  });

  it("scaleDown divides value by 10^decimals (integer division)", () => {
    const value = BigInt(12300);
    const down = scaleDown(value, 2);
    expect(down).toBe(BigInt(123));
  });

  it("scaleDown(scaleUp(x,d), d) returns original for integer values", () => {
    const x = BigInt(42);
    const d = 3;
    const round = scaleDown(scaleUp(x, d), d);
    expect(round).toBe(x);
  });

  it("min returns the smallest bigint among arguments", () => {
    const a = BigInt(10);
    const b = BigInt(-5);
    const c = BigInt(7);
    expect(min(a, b, c)).toBe(b);
  });
});
