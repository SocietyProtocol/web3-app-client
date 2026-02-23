import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { Hex } from "viem";
import { useReadContract } from "wagmi";

export const useReferredBy = (address?: Hex) => {
  const contractAddress = useChainVar(contracts.badges);

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
