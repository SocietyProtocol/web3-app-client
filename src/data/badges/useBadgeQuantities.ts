import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { useMemo } from "react";
import { Address, isAddress } from "viem";
import { useReadContracts } from "wagmi";

/**
 * Upper bound on holders whose balance is read for one badge. Holder lists
 * beyond this still render; they just show no per-holder amount.
 */
export const MAX_HOLDER_BALANCES = 500;

type BadgeAmounts = ReadonlyMap<string, bigint>;

const EMPTY: BadgeAmounts = new Map();

const unique = (ids: readonly string[]) => Array.from(new Set(ids));

/**
 * Reads `totalSupply(id)` for each badge id. Ids whose call fails are left
 * out of the map, so callers can tell "unknown" from "zero".
 */
export const useBadgeTotalSupplies = (ids: readonly string[]) => {
  const badges = useChainVar(contracts.badges);
  const distinct = useMemo(() => unique(ids), [ids]);

  const query = useReadContracts({
    contracts: distinct.map((id) => ({
      address: badges,
      abi: SocietyProtocolBadgesABI,
      functionName: "totalSupply" as const,
      args: [BigInt(id)] as const,
      chainId: expectedNetwork.id,
    })),
    query: { enabled: isAddress(badges) && distinct.length > 0 },
  });

  const supplies = useMemo<BadgeAmounts>(() => {
    const result = new Map<string, bigint>();
    query.data?.forEach((entry, index) => {
      if (entry.status === "success" && typeof entry.result === "bigint") {
        result.set(distinct[index], entry.result);
      }
    });
    return result.size === 0 ? EMPTY : result;
  }, [query.data, distinct]);

  return { supplies, isLoading: query.isLoading };
};

/** One account's `balanceOf` for each badge id. */
export const useAccountBadgeBalances = (
  account: Address | undefined,
  ids: readonly string[],
) => {
  const badges = useChainVar(contracts.badges);
  const distinct = useMemo(() => unique(ids), [ids]);

  const query = useReadContracts({
    contracts: distinct.map((id) => ({
      address: badges,
      abi: SocietyProtocolBadgesABI,
      functionName: "balanceOf" as const,
      args: [account as Address, BigInt(id)] as const,
      chainId: expectedNetwork.id,
    })),
    query: {
      enabled:
        !!account &&
        isAddress(account) &&
        isAddress(badges) &&
        distinct.length > 0,
    },
  });

  const balances = useMemo<BadgeAmounts>(() => {
    const result = new Map<string, bigint>();
    query.data?.forEach((entry, index) => {
      if (entry.status === "success" && typeof entry.result === "bigint") {
        result.set(distinct[index], entry.result);
      }
    });
    return result.size === 0 ? EMPTY : result;
  }, [query.data, distinct]);

  return { balances, isLoading: query.isLoading };
};

/** Each holder's `balanceOf` for one badge, keyed by lowercase address. */
export const useBadgeHolderBalances = (
  badgeId: string | undefined,
  holders: readonly string[],
) => {
  const badges = useChainVar(contracts.badges);
  const capped = useMemo(
    () => unique(holders.map((holder) => holder.toLowerCase())).slice(
      0,
      MAX_HOLDER_BALANCES,
    ),
    [holders],
  );

  const query = useReadContracts({
    contracts: capped.map((holder) => ({
      address: badges,
      abi: SocietyProtocolBadgesABI,
      functionName: "balanceOf" as const,
      args: [holder as Address, BigInt(badgeId ?? 0)] as const,
      chainId: expectedNetwork.id,
    })),
    query: {
      enabled: badgeId !== undefined && isAddress(badges) && capped.length > 0,
    },
  });

  const balances = useMemo<BadgeAmounts>(() => {
    const result = new Map<string, bigint>();
    query.data?.forEach((entry, index) => {
      if (entry.status === "success" && typeof entry.result === "bigint") {
        result.set(capped[index], entry.result);
      }
    });
    return result.size === 0 ? EMPTY : result;
  }, [query.data, capped]);

  return { balances, isLoading: query.isLoading };
};
