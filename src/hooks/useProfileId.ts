import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useMemo } from "react";
import { Hex, isAddress } from "viem";
import { useChainId, useReadContract } from "wagmi";

export const useProfileId = (address?: Hex) => {
  const chainId = useChainId();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId]
  );

  const profileIdResult = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "userProfileId",
    args: address ? [address] : undefined,

    query: {
      enabled: Boolean(address) && isAddress(contractAddress),
      staleTime: Infinity,
    },
  });

  return profileIdResult;
};
