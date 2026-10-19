import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appChainId,
  getLegacyMap,
  legacySmartAccount,
  migratedProfileRedirect,
} from "./legacyAccounts";

vi.mock("@/consts/legacy-account-map.json", () => ({
  default: {
    "1": {
      "0x1d7af3d1de21354bbffe7d22761aeddcbe71d216":
        "0x3DCc9632be6CF6e63FaE7009949A185F4cd38C23",
    },
    "11155111": {},
  },
}));

describe("legacyAccounts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("follows the app environment, not the wallet", () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    expect(appChainId()).toBe(1);
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
    expect(appChainId()).toBe(11155111);
  });

  it("reads one chain's map", () => {
    expect(Object.keys(getLegacyMap(1))).toHaveLength(1);
    expect(getLegacyMap(11155111)).toEqual({});
    expect(getLegacyMap(10)).toEqual({});
  });

  it("maps an old wallet case-insensitively on its chain only", () => {
    const eoa = "0x1d7Af3d1de21354BBFFE7d22761AeDDCBE71D216";
    expect(legacySmartAccount(eoa, 1)).toBe(
      "0x3DCc9632be6CF6e63FaE7009949A185F4cd38C23",
    );
    expect(legacySmartAccount(eoa.toLowerCase(), 1)).toBe(
      "0x3DCc9632be6CF6e63FaE7009949A185F4cd38C23",
    );
    expect(legacySmartAccount(eoa, 11155111)).toBeUndefined();
    expect(legacySmartAccount(undefined, 1)).toBeUndefined();
  });

  it("defaults to the app chain", () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
    expect(
      legacySmartAccount("0x1d7Af3d1de21354BBFFE7d22761AeDDCBE71D216"),
    ).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    expect(
      legacySmartAccount("0x1d7Af3d1de21354BBFFE7d22761AeDDCBE71D216"),
    ).toBeDefined();
  });
});

describe("migratedProfileRedirect", () => {
  const smart = "0x3DCc9632be6CF6e63FaE7009949A185F4cd38C23" as const;

  it("does nothing for wallets that were not migrated", () => {
    expect(migratedProfileRedirect(undefined, { isLoading: true })).toBeUndefined();
  });

  it("waits for the Light Account's user", () => {
    expect(migratedProfileRedirect(smart, { isLoading: true })).toBe("pending");
  });

  it("redirects only once the Light Account has a profile", () => {
    expect(
      migratedProfileRedirect(smart, { isLoading: false, data: { profile: { id: "7" } } }),
    ).toBe(smart);
    expect(
      migratedProfileRedirect(smart, { isLoading: false, data: { profile: null } }),
    ).toBeUndefined();
    expect(migratedProfileRedirect(smart, { isLoading: false, data: null })).toBeUndefined();
  });
});
