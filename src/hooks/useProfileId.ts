import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useMemo } from "react";
import { Address, isAddress } from "viem";
import { useChainId, useReadContract } from "wagmi";

export const useProfileId = (address?: Address) => {
  const chainId = useChainId();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId]
  );

  return useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "profileBadgeId",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isAddress(address) && isAddress(contractAddress),
      staleTime: Infinity,
    },
  });
};
