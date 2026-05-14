import { useCallback } from "react";
import { Hex, TransactionReceipt } from "viem";
import { useAccount } from "wagmi";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useTransaction } from "@/hooks/useTransaction";
import { capturePostHogEvent } from "@/lib/posthog";

interface UseTransferOwnershipProps {
  enabled?: boolean;
  communityId: string;
  managerBadgeId?: string;
  newOwner?: Hex;
  onSuccess?: (receipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export function useTransferOwnership({
  enabled = true,
  communityId,
  managerBadgeId,
  newOwner,
  onSuccess,
  onError,
}: UseTransferOwnershipProps) {
  const { address } = useAccount();
  const badgesAddress = useChainVar(contracts.badges);

  const hasArgs = !!address && !!managerBadgeId && !!newOwner;

  const transaction = useTransaction({
    address: badgesAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "safeTransferFrom",
    args:
      enabled && hasArgs
        ? [address, newOwner, BigInt(managerBadgeId), BigInt(1), "0x" as Hex]
        : undefined,
    enabled: enabled && hasArgs,
    simulate: enabled && hasArgs,
    waitForSync: true,
    successMessage: "Community ownership transferred successfully",
    queryKeysToInvalidateOnSuccess: [
      ["community", communityId],
      ["communities"],
      ["badge", managerBadgeId],
      ["badges"],
      ["user", address?.toLowerCase()],
      ["community-members"],
      ["community-members-infinite"],
    ],
    onSuccess: (receipt) => {
      capturePostHogEvent("community_ownership_transferred", {
        community_id: communityId,
        manager_badge_id: managerBadgeId,
        new_owner: newOwner,
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
      });
      onSuccess?.(receipt);
    },
    onError,
  });

  const transfer = useCallback(
    (newOwner: Hex) => {
      if (!address || !managerBadgeId) return;
      return transaction.execute({
        address: badgesAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "safeTransferFrom",
        args: [
          address,
          newOwner,
          BigInt(managerBadgeId),
          BigInt(1),
          "0x" as Hex,
        ],
      });
    },
    [address, badgesAddress, managerBadgeId, transaction],
  );

  return { transfer, ...transaction };
}
