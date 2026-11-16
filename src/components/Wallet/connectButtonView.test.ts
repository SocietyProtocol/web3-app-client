import { describe, expect, it } from "vitest";
import { connectButtonView } from "./connectButtonView";

const SOCIETY = "0x00000000000000000000000000000000000000aa";

const settled = {
  mounted: true,
  wagmiReady: true,
  hasAccount: false,
  userLoading: false,
  identityLoading: false,
};

describe("connectButtonView", () => {
  it("offers Connect once wagmi has settled with no wallet", () => {
    expect(connectButtonView(settled)).toBe("connect");
  });

  it("shows a placeholder before RainbowKit has mounted", () => {
    expect(connectButtonView({ ...settled, mounted: false })).toBe("skeleton");
  });

  it("does not offer Connect while wagmi reconnects a wallet (B-4)", () => {
    // RainbowKit is mounted but reports no account until the reconnect ends.
    expect(connectButtonView({ ...settled, wagmiReady: false })).toBe(
      "skeleton",
    );
  });

  it("shows a placeholder while the Society address is worked out", () => {
    const connected = { ...settled, hasAccount: true };
    expect(connectButtonView({ ...connected, identityLoading: true })).toBe(
      "skeleton",
    );
    expect(connectButtonView(connected)).toBe("skeleton");
    expect(
      connectButtonView({ ...connected, address: SOCIETY, userLoading: true }),
    ).toBe("skeleton");
  });

  it("shows the account once the Society address and its user are known", () => {
    expect(
      connectButtonView({ ...settled, hasAccount: true, address: SOCIETY }),
    ).toBe("account");
  });
});
