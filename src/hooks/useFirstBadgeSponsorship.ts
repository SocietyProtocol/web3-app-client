"use client";

import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { fetchFirstBadgeStatus } from "@/lib/first-badge-client";
import { supportedAaChainId } from "@/lib/smart-account";

export const FIRST_BADGE_QUERY_KEY = "first-badge";

/**
 * Whether this account's next badge is its free first badge. Only Light
 * Accounts have one; contract wallets always pay their own gas.
 * Shown in the wizard; the write itself asks again when it is sent.
 */
export function useFirstBadgeSponsorship(options?: { enabled?: boolean }) {
  const chainId = useChainId();
  const outpost = useOutpostAccount();
  const sender = outpost.isSmartAccount ? outpost.address : undefined;
  const query = useQuery({
    queryKey: [FIRST_BADGE_QUERY_KEY, chainId, sender],
    queryFn: () => fetchFirstBadgeStatus(chainId, sender!),
    enabled:
      (options?.enabled ?? true) &&
      !!sender &&
      !outpost.isContractWallet &&
      supportedAaChainId(chainId),
    staleTime: 30_000,
    retry: false,
  });
  return { eligible: query.data?.eligible === true, isLoading: query.isLoading };
}
