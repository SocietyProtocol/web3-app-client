/**
 * What the header's wallet button shows. "connect" only once wagmi's
 * reconnect attempt has settled with no wallet: while it runs, RainbowKit
 * reports no account even for a member whose wallet is connected. Until the
 * Society address is known, nothing copyable: the wallet address is not the
 * member's identity.
 */
export function connectButtonView(input: {
  mounted: boolean;
  wagmiReady: boolean;
  hasAccount: boolean;
  userLoading: boolean;
  identityLoading: boolean;
  address?: string;
}): "skeleton" | "connect" | "account" {
  if (!input.mounted || !input.wagmiReady || input.userLoading) {
    return "skeleton";
  }
  if (!input.hasAccount) {
    return "connect";
  }
  return input.identityLoading || !input.address ? "skeleton" : "account";
}
