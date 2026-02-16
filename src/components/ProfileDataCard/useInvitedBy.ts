import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { Hex } from "viem";
import { useChainId, useReadContract } from "wagmi";

export const useInvitedBy = (address?: Hex) => {
  const chainId = useChainId();
  const contractAddress = getBadgesContractAddress(chainId);

  return useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "invitedBy",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });
};
