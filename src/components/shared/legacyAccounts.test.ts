import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import {
  legacyAccountsFor,
  legacyOwnerOf,
  legacySocietyAddress,
  replaceRecipient,
  resolveRecipient,
  resolveRecipients,
} from "./legacyAccounts";

const E1 = "0x9ba704115f0ed3a431a025ffa0525fdd1d507c3c";
const S1 = "0xA47f4D7D2FAbDbfDCe865501ADc55a2b370c88cb";
const E2 = "0x51bd128eb1f801ce41910001589d41d452bd6eeb";
const S2 = "0x04F23204ad3f9A55338F9EBbF7805633D694C0B4";
const OTHER = "0x1111111111111111111111111111111111111111";

const flat = { [E1]: S1, [E2]: S2 };
const keyed = { "1": { [E1]: S1 }, "11155111": { [E2]: S2 } };

describe("legacyAccountsFor", () => {
  it("applies a flat map to every chain", () => {
    expect(legacyAccountsFor(1, flat)[E1]).toBe(S1);
    expect(legacyAccountsFor(11155111, flat)[E2]).toBe(S2);
    expect(legacyAccountsFor(undefined, flat)[E1]).toBe(S1);
  });

  it("picks the chain's entry from a chain-keyed map", () => {
    expect(legacyAccountsFor(1, keyed)).toEqual({ [E1]: S1 });
    expect(legacyAccountsFor(11155111, keyed)).toEqual({ [E2]: S2 });
    expect(legacyAccountsFor(10, keyed)).toEqual({});
    expect(legacyAccountsFor(undefined, keyed)).toEqual({});
  });

  it("lower-cases keys and drops malformed entries", () => {
    const map = legacyAccountsFor(1, {
      [getAddress(E1)]: S1,
      nope: S2,
      [E2]: "not-an-address",
    });
    expect(map).toEqual({ [E1]: S1 });
  });

  it("loads the bundled map without throwing", () => {
    expect(typeof legacyAccountsFor(1)).toBe("object");
  });
});

describe("legacy lookups", () => {
  it("maps a wallet to its Society address, case-insensitively", () => {
    expect(legacySocietyAddress(getAddress(E1), 1, flat)).toBe(S1);
    expect(legacySocietyAddress(OTHER, 1, flat)).toBeUndefined();
    expect(legacySocietyAddress(undefined, 1, flat)).toBeUndefined();
  });

  it("finds the owner wallet of a Society address", () => {
    expect(legacyOwnerOf(S1.toLowerCase(), 1, flat)).toBe(getAddress(E1));
    expect(legacyOwnerOf(S2, 1, keyed)).toBeUndefined();
    expect(legacyOwnerOf(S2, 11155111, keyed)).toBe(getAddress(E2));
  });
});

describe("resolveRecipient", () => {
  it("replaces a legacy wallet and records where it came from", () => {
    expect(resolveRecipient(` ${E1} `, 1, flat)).toEqual({
      address: S1,
      mappedFrom: getAddress(E1),
    });
  });

  it("passes other input through trimmed", () => {
    expect(resolveRecipient(` ${OTHER}`, 1, flat)).toEqual({ address: OTHER });
    expect(resolveRecipient("bob", 1, flat)).toEqual({ address: "bob" });
  });

  it("de-duplicates a list after mapping", () => {
    const result = resolveRecipients([E1, S1, OTHER, E2], 1, flat);
    expect(result.addresses).toEqual([S1, OTHER, S2]);
    expect(result.mapped).toEqual([
      { from: getAddress(E1), to: S1 },
      { from: getAddress(E2), to: S2 },
    ]);
  });
});

describe("replaceRecipient", () => {
  it("swaps in place and drops a resulting duplicate", () => {
    expect(replaceRecipient([OTHER, E1], E1.toUpperCase(), S1)).toEqual([
      OTHER,
      S1,
    ]);
    expect(replaceRecipient([S1, E1], E1, S1)).toEqual([S1]);
  });
});
