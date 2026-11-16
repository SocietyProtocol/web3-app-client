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

/**
 * keptSlot: the children are rendered in the guard's kept slot, one wrapper
 * at a fixed place in the guard's output, shown with "children" and hidden
 * under the prompt with "bubble". React keeps a component's state only while
 * it stays at the same place in the tree, so a guard that keeps its children
 * mounted must use the kept slot for both, never the bare children for one
 * and a hidden wrapper for the other.
 */
export type ContentGuardView =
  | { show: "fallback" }
  | { show: "children"; keptSlot: boolean }
  | { show: "bubble"; keptSlot: boolean };

/**
 * What a ContentGuard renders. A wrong network is the one requirement the
 * user can meet without leaving the page, so a guard can keep its children
 * mounted under the switch prompt: a form then keeps what was typed.
 */
export const contentGuardView = (
  state: ContentGuardState,
): ContentGuardView => {
  if (state.loading || !state.wagmiReady || state.accountLoading) {
    return { show: "fallback" };
  }

  if (state.isConnected && !state.networkMissing && !state.accountMissing) {
    return { show: "children", keptSlot: state.keepMountedOnWrongNetwork };
  }

  return {
    show: "bubble",
    keptSlot:
      state.keepMountedOnWrongNetwork &&
      state.isConnected &&
      state.networkMissing &&
      !state.accountMissing,
  };
};
