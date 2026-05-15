import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useReadContract } from "wagmi";

export const useDomainData = () => {
  const badgesContract = useChainVar(contracts.badges);

  return useReadContract({
    address: badgesContract,
    abi: SocietyProtocolBadgesABI,
    functionName: "eip712Domain",
    query: { staleTime: Infinity, gcTime: Infinity },
  });
};
