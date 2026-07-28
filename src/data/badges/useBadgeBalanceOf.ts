import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { expectedNetwork } from "@/lib/wagmi";
import { Address, isAddress } from "viem";
import { useReadContract } from "wagmi";

/**
 * Reads the ERC-1155 balance of a given badge id for a given account.
 * Returns 0 when the account doesn't hold the badge.
 */
export const useBadgeBalanceOf = (
  address?: Address,
  badgeId?: string | number | bigint,
) => {
  const contractAddress = useChainVar(contracts.badges);
  const id = badgeId !== undefined ? BigInt(badgeId) : undefined;

  return useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "balanceOf",
    args: address && id !== undefined ? [address, id] : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled:
        !!address &&
        isAddress(address) &&
        isAddress(contractAddress) &&
        id !== undefined,
    },
  });
};
