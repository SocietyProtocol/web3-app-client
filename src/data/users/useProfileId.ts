import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { Address, isAddress } from "viem";
import { useReadContract } from "wagmi";

export const useProfileId = (address?: Address) => {
  const contractAddress = useChainVar(contracts.badges);

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
