import { describe, expect, it } from "vitest";
import { homeIdentityAction } from "./identityAction";

const connected = {
  wagmiReady: true,
  isConnected: true,
  identityLoading: false,
  isWrongNetwork: false,
  profileLoading: false,
};

describe("homeIdentityAction", () => {
  it("offers Connect to a visitor once wagmi is ready", () => {
    expect(homeIdentityAction({ ...connected, isConnected: false })).toBe(
      "connect",
    );
  });

  it("offers neither Connect nor setup before wagmi is ready", () => {
    expect(
      homeIdentityAction({
        ...connected,
        wagmiReady: false,
        isConnected: false,
      }),
    ).toBe("profile");
  });

  it("does not offer setup while the wallet's code is read (A9)", () => {
    // The address is unknown, so the profile read is disabled: no data,
    // not loading. That is not "no profile".
    expect(
      homeIdentityAction({
        ...connected,
        identityLoading: true,
        profileId: undefined,
      }),
    ).toBe("profile");
  });

  it("does not offer setup while the profile is read", () => {
    expect(homeIdentityAction({ ...connected, profileLoading: true })).toBe(
      "profile",
    );
  });

  it("offers setup to a wallet with no profile", () => {
    expect(homeIdentityAction({ ...connected, profileId: BigInt(0) })).toBe(
      "claim",
    );
  });

  it("offers the profile to a member", () => {
    expect(homeIdentityAction({ ...connected, profileId: BigInt(7) })).toBe(
      "profile",
    );
  });

  it("does not offer setup on the wrong network", () => {
    expect(
      homeIdentityAction({
        ...connected,
        isWrongNetwork: true,
        profileId: BigInt(0),
      }),
    ).toBe("profile");
  });
});
