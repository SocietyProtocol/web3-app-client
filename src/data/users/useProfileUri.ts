import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork, getBadgesContractAddress } from "@/lib/wagmi";
import { useReadContract } from "wagmi";

export const useProfileUri = (profileId?: bigint) => {
  const contractAddress = useChainVar(getBadgesContractAddress);

  const uriResult = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "uri",
    args: profileId ? [profileId] : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled: Boolean(profileId && profileId !== BigInt(0) && contractAddress),
      staleTime: Infinity,
      retry: 1,
    },
  });

  return uriResult;
};
