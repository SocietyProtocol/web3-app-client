import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useMemo } from "react";
import { useChainId, useReadContract } from "wagmi";

export const useProfileUri = (profileId?: bigint) => {
  const chainId = useChainId();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId]
  );

  const uriResult = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "uri",
    args: profileId ? [profileId] : undefined,
    query: {
      enabled: Boolean(profileId && profileId !== BigInt(0) && contractAddress),
      staleTime: Infinity,
      retry: 1,
    },
  });

  return uriResult;
};
