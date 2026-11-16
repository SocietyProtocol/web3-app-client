import { describe, expect, it } from "vitest";
import { holdersLabel } from "./holdersLabel";

describe("holdersLabel", () => {
  it("uses the singular for one holder, given as the subgraph's string", () => {
    expect(holdersLabel("1")).toBe("1 holder");
  });

  it("uses the singular for one holder, given as a number", () => {
    expect(holdersLabel(1)).toBe("1 holder");
  });

  it("uses the plural for zero and for more than one", () => {
    expect(holdersLabel("0")).toBe("0 holders");
    expect(holdersLabel("2")).toBe("2 holders");
    expect(holdersLabel(23)).toBe("23 holders");
  });

  it("reads a missing count as zero", () => {
    expect(holdersLabel(undefined)).toBe("0 holders");
    expect(holdersLabel(null)).toBe("0 holders");
  });
});
