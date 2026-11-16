import { Address } from "viem";
import { mainnet, sepolia } from "viem/chains";
import {
  legacyAccountsFor,
  legacySocietyAddress,
} from "@/components/shared/legacyAccounts";

/**
 * The chain the app is deployed against: production is mainnet, every
 * other environment is Sepolia. Same rule as `expectedNetwork` in
 * lib/wagmi, read here without pulling in wagmi so data helpers stay
 * importable in tests. This is not the wallet's chain.
 */
export const appChainId = (): number =>
  process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ? mainnet.id : sepolia.id;

/** Old wallet (lowercase) => its Light Account, for one chain. */
export const getLegacyMap = (
  chainId: number = appChainId(),
): Record<string, Address> => legacyAccountsFor(chainId);

/** The Light Account a pre-migration wallet moved to, if it is one. */
export const legacySmartAccount = (
  eoa: string | undefined,
  chainId: number = appChainId(),
): Address | undefined => legacySocietyAddress(eoa, chainId);

/**
 * Where /user/<old wallet> should go. Only to the Light Account once it has
 * a profile, the same rule that hides the old card from the directory;
 * until then the old wallet's own profile is shown. "pending" while the
 * Light Account's user is loading.
 */
export const migratedProfileRedirect = (
  smartAccount: Address | undefined,
  smartUser: { isLoading: boolean; data?: { profile?: unknown } | null },
): Address | "pending" | undefined => {
  if (!smartAccount) return undefined;
  if (smartUser.isLoading) return "pending";
  return smartUser.data?.profile ? smartAccount : undefined;
};
