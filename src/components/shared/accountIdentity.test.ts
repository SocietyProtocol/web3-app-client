import { describe, expect, it } from "vitest";
import { findIdentity, holdsAny, identityAddresses } from "./accountIdentity";

const S = "0xA47f4D7D2FAbDbfDCe865501ADc55a2b370c88cb";
const E = "0x9ba704115f0ed3a431a025ffa0525fdd1d507c3c";

describe("identityAddresses", () => {
  it("lists the Society address first, then the owner wallet", () => {
    expect(identityAddresses(S, E)).toEqual([S, E]);
  });

  it("collapses a contract wallet that is its own owner", () => {
    expect(identityAddresses(S, S.toLowerCase())).toEqual([S]);
  });

  it("skips missing addresses", () => {
    expect(identityAddresses(undefined, E)).toEqual([E]);
    expect(identityAddresses()).toEqual([]);
  });
});

describe("findIdentity / holdsAny", () => {
  it("matches a legacy manager on the owner wallet", () => {
    expect(findIdentity(E.toUpperCase().replace("0X", "0x"), [S, E])).toBe(E);
    expect(holdsAny([E.toUpperCase()], [S, E])).toBe(true);
  });

  it("matches the Society address", () => {
    expect(findIdentity(S.toLowerCase(), [S, E])).toBe(S);
  });

  it("is false for strangers and empty inputs", () => {
    const stranger = "0x1111111111111111111111111111111111111111";
    expect(findIdentity(stranger, [S, E])).toBeUndefined();
    expect(findIdentity(undefined, [S, E])).toBeUndefined();
    expect(holdsAny([stranger], [S, E])).toBe(false);
    expect(holdsAny(undefined, [S, E])).toBe(false);
    expect(holdsAny([S], [])).toBe(false);
  });
});
