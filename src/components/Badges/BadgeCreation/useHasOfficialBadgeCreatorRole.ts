import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { Hex } from "viem";
import { useReadContract } from "wagmi";

export const useHasOfficialBadgeCreatorRole = (address?: Hex) => {
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

  return {
    ...hasRole,
    isLoading: officialBadgeCreatorRole.isLoading || hasRole.isLoading,
  };
};
