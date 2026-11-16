export type ContentGuardState = {
  loading: boolean;
  wagmiReady: boolean;
  isConnected: boolean;
  /** The guard requires the expected network and the wallet is on another one. */
  networkMissing: boolean;
  /** The guard requires a profile and the user query is still loading. */
  accountLoading: boolean;
  /** The guard requires a profile and the user has none. */
  accountMissing: boolean;
  /** Keep the children mounted, hidden, while only the network is wrong. */
  keepMountedOnWrongNetwork: boolean;
};

export type ContentGuardView =
  | { show: "fallback" }
  | { show: "children" }
  | { show: "bubble"; keepChildrenMounted: boolean };

/**
 * What a ContentGuard renders. A wrong network is the one requirement the
 * user can meet without leaving the page, so a guard can keep its children
 * mounted under the switch prompt: a form then keeps what was typed.
 */
export const contentGuardView = (state: ContentGuardState): ContentGuardView => {
  if (state.loading || !state.wagmiReady || state.accountLoading) {
    return { show: "fallback" };
  }

  if (state.isConnected && !state.networkMissing && !state.accountMissing) {
    return { show: "children" };
  }

  return {
    show: "bubble",
    keepChildrenMounted:
      state.keepMountedOnWrongNetwork &&
      state.isConnected &&
      state.networkMissing &&
      !state.accountMissing,
  };
};
