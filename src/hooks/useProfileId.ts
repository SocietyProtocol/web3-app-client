import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useMemo } from "react";
import { isAddress } from "viem";
import { useChainId, useReadContract } from "wagmi";

export const useProfileId = (address?: `0x${string}`) => {
  const chainId = useChainId();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId]
  );

  console.log({ address, contractAddress });

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
