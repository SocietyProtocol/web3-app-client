import { describe, expect, it } from "vitest";
import { ContentGuardState, contentGuardView } from "./contentGuardView";

const ready: ContentGuardState = {
  loading: false,
  wagmiReady: true,
  isConnected: true,
  networkMissing: false,
  accountLoading: false,
  accountMissing: false,
  keepMountedOnWrongNetwork: false,
};

describe("contentGuardView", () => {
  it("shows the fallback while loading, before wagmi is ready, or while the account loads", () => {
    expect(contentGuardView({ ...ready, loading: true })).toEqual({
      show: "fallback",
    });
    expect(contentGuardView({ ...ready, wagmiReady: false })).toEqual({
      show: "fallback",
    });
    expect(contentGuardView({ ...ready, accountLoading: true })).toEqual({
      show: "fallback",
    });
  });

  it("shows the bare children when every requirement is met", () => {
    expect(contentGuardView(ready)).toEqual({
      show: "children",
      keptSlot: false,
    });
  });

  it("unmounts the children on the wrong network unless asked to keep them", () => {
    expect(contentGuardView({ ...ready, networkMissing: true })).toEqual({
      show: "bubble",
      keptSlot: false,
    });
  });

  it("keeps the children in the same slot on the right and on the wrong network when asked", () => {
    // The same slot in both states is what lets React keep the children's
    // state (a typed form) across the switch; bare children on one side and
    // a hidden wrapper on the other would remount them.
    const keep = { ...ready, keepMountedOnWrongNetwork: true };
    expect(contentGuardView(keep)).toEqual({
      show: "children",
      keptSlot: true,
    });
    expect(contentGuardView({ ...keep, networkMissing: true })).toEqual({
      show: "bubble",
      keptSlot: true,
    });
  });

  it("does not keep the children for a requirement other than the network", () => {
    const keep = { ...ready, keepMountedOnWrongNetwork: true };
    expect(contentGuardView({ ...keep, isConnected: false })).toEqual({
      show: "bubble",
      keptSlot: false,
    });
    expect(contentGuardView({ ...keep, accountMissing: true })).toEqual({
      show: "bubble",
      keptSlot: false,
    });
    expect(
      contentGuardView({ ...keep, networkMissing: true, accountMissing: true }),
    ).toEqual({
      show: "bubble",
      keptSlot: false,
    });
    expect(
      contentGuardView({ ...keep, networkMissing: true, isConnected: false }),
    ).toEqual({
      show: "bubble",
      keptSlot: false,
    });
  });
});
