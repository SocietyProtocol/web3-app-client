/**
 * The home identity card's action. A connected wallet whose Society address
 * is still being worked out (its code is read) is not "no profile": it gets
 * no setup offer until the profile has been read for that address.
 */
export function homeIdentityAction(input: {
  wagmiReady: boolean;
  isConnected: boolean;
  identityLoading: boolean;
  isWrongNetwork: boolean;
  profileLoading: boolean;
  profileId?: bigint;
}): "connect" | "claim" | "profile" {
  if (!input.wagmiReady) return "profile";
  if (!input.isConnected) return "connect";
  const needsAccountSetup =
    !input.identityLoading &&
    !input.isWrongNetwork &&
    !input.profileLoading &&
    (input.profileId === undefined || input.profileId === BigInt(0));
  return needsAccountSetup ? "claim" : "profile";
}
