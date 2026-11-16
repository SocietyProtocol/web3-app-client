import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { useMemo } from "react";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import { circularInvitationPairs } from "./circularInvitation";

/**
 * Whether I already invited the inviter of a referral code (see
 * circularInvitationPairs). `data` is true when any of the pairs is set.
 */
export const useHasInvited = (input: {
  wallet?: string;
  address?: string;
  codeInviter?: string;
}) => {
  const { wallet, address, codeInviter } = input;
  const contractAddress = useChainVar(contracts.badges);
  const pairs = useMemo(
    () => circularInvitationPairs({ wallet, address, codeInviter }),
    [wallet, address, codeInviter],
  );

  const query = useReadContracts({
    allowFailure: false,
    contracts: pairs.map((pair) => ({
      address: contractAddress,
      abi: SocietyProtocolBadgesABI,
      functionName: "hasInvited" as const,
      args: pair,
      chainId: expectedNetwork.id,
    })),
    query: {
      enabled:
        pairs.length > 0 && isAddress(contractAddress, { strict: false }),
      staleTime: 30_000,
      retry: 1,
    },
  });

  return {
    data: query.data?.some(Boolean),
    error: query.error,
    isFetching: query.isFetching,
  };
};
