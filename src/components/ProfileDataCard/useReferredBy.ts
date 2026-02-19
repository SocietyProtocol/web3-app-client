import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork, getBadgesContractAddress } from "@/lib/wagmi";
import { Hex } from "viem";
import { useReadContract } from "wagmi";

export const useReferredBy = (address?: Hex) => {
  const contractAddress = useChainVar(getBadgesContractAddress);

  return useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "invitedBy",
    args: address ? [address] : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled: !!address,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });
};
