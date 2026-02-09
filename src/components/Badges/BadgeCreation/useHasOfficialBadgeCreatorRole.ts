import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useMemo } from "react";
import { Hex } from "viem";
import { useAccount, useReadContract } from "wagmi";

export const useHasOfficialBadgeCreatorRole = (address?: Hex) => {
  const { chainId } = useAccount();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId],
  );
  const officialBadgeCreatorRole = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "OFFICIAL_BADGE_CREATOR_ROLE",
    query: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  return useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "hasRole",
    args:
      officialBadgeCreatorRole.data && address
        ? [officialBadgeCreatorRole.data, address]
        : undefined,
    query: {
      enabled: !!officialBadgeCreatorRole.data && !!address,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });
};
