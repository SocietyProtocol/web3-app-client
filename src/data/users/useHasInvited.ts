import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { Hex, isAddress } from "viem";
import { useReadContract } from "wagmi";

export const useHasInvited = (invitee?: Hex, inviter?: Hex) => {
  const contractAddress = useChainVar(contracts.badges);

  return useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "hasInvited",
    args: invitee && inviter ? [invitee, inviter] : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled: Boolean(
        invitee &&
        inviter &&
        isAddress(invitee, { strict: false }) &&
        isAddress(inviter, { strict: false }) &&
        isAddress(contractAddress, { strict: false }),
      ),
      staleTime: 30_000,
      retry: 1,
    },
  });
};
