import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { Hex } from "viem";
import { useReadContract } from "wagmi";

/**
 * True if `address` or `ownerAddress` holds OFFICIAL_BADGE_CREATOR_ROLE.
 * Roles granted before the Light Account migration stay on the wallet.
 */
export const useHasOfficialBadgeCreatorRole = (
  address?: Hex,
  ownerAddress?: Hex,
) => {
  const contractAddress = useChainVar(contracts.badges);

  const officialBadgeCreatorRole = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "OFFICIAL_BADGE_CREATOR_ROLE",
    chainId: expectedNetwork.id,
    query: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const hasRole = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "hasRole",
    args:
      officialBadgeCreatorRole.data && address
        ? [officialBadgeCreatorRole.data, address]
        : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled: !!officialBadgeCreatorRole.data && !!address,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const checkOwner =
    !!ownerAddress &&
    (!address || ownerAddress.toLowerCase() !== address.toLowerCase());

  const ownerHasRole = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "hasRole",
    args:
      officialBadgeCreatorRole.data && checkOwner
        ? [officialBadgeCreatorRole.data, ownerAddress]
        : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled: !!officialBadgeCreatorRole.data && checkOwner,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  return {
    ...hasRole,
    data:
      hasRole.data === true || ownerHasRole.data === true ? true : hasRole.data,
    isLoading:
      officialBadgeCreatorRole.isLoading ||
      hasRole.isLoading ||
      (checkOwner && ownerHasRole.isLoading),
  };
};
