import { describe, expect, it } from "vitest";
import { avatarLookupAddress } from "./avatarLookup";

const address = "0x1111111111111111111111111111111111111111";

describe("avatarLookupAddress", () => {
  it("looks up the user when the caller has no subgraph image for it", () => {
    expect(avatarLookupAddress(address)).toBe(address);
    expect(avatarLookupAddress(address, undefined)).toBe(address);
  });

  it("makes no request when the caller already has the user's image", () => {
    expect(avatarLookupAddress(address, "ipfs://bafytestcid")).toBeUndefined();
  });

  it("makes no request when the caller knows the user has no image", () => {
    expect(avatarLookupAddress(address, null)).toBeUndefined();
    expect(avatarLookupAddress(address, "")).toBeUndefined();
  });

  it("makes no request without a valid address", () => {
    expect(avatarLookupAddress(undefined)).toBeUndefined();
    expect(avatarLookupAddress("")).toBeUndefined();
    expect(avatarLookupAddress("0x1234")).toBeUndefined();
  });
});
