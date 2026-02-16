import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork, getBadgesContractAddress } from "@/lib/wagmi";
import { Address, isAddress } from "viem";
import { useReadContract } from "wagmi";

export const useProfileId = (address?: Address) => {
  const contractAddress = useChainVar(getBadgesContractAddress);

  return useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "profileBadgeId",
    args: address ? [address] : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled: !!address && isAddress(address) && isAddress(contractAddress),
      staleTime: Infinity,
    },
  });
};
