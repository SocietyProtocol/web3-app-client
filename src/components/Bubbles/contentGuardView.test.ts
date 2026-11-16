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
    expect(contentGuardView({ ...ready, loading: true })).toEqual({ show: "fallback" });
    expect(contentGuardView({ ...ready, wagmiReady: false })).toEqual({ show: "fallback" });
    expect(contentGuardView({ ...ready, accountLoading: true })).toEqual({ show: "fallback" });
  });

  it("shows the children when every requirement is met", () => {
    expect(contentGuardView(ready)).toEqual({ show: "children" });
    expect(contentGuardView({ ...ready, keepMountedOnWrongNetwork: true })).toEqual({ show: "children" });
  });

  it("unmounts the children on the wrong network unless asked to keep them", () => {
    expect(contentGuardView({ ...ready, networkMissing: true })).toEqual({
      show: "bubble",
      keepChildrenMounted: false,
    });
  });

  it("keeps the children mounted under the switch prompt when asked", () => {
    expect(contentGuardView({ ...ready, networkMissing: true, keepMountedOnWrongNetwork: true })).toEqual({
      show: "bubble",
      keepChildrenMounted: true,
    });
  });

  it("does not keep the children for a requirement other than the network", () => {
    const keep = { ...ready, keepMountedOnWrongNetwork: true };
    expect(contentGuardView({ ...keep, isConnected: false })).toEqual({
      show: "bubble",
      keepChildrenMounted: false,
    });
    expect(contentGuardView({ ...keep, accountMissing: true })).toEqual({
      show: "bubble",
      keepChildrenMounted: false,
    });
    expect(contentGuardView({ ...keep, networkMissing: true, accountMissing: true })).toEqual({
      show: "bubble",
      keepChildrenMounted: false,
    });
    expect(contentGuardView({ ...keep, networkMissing: true, isConnected: false })).toEqual({
      show: "bubble",
      keepChildrenMounted: false,
    });
  });
});
