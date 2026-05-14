import { useCallback } from "react";
import { TransactionReceipt } from "viem";
import { useAccount } from "wagmi";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useMutateMetadata } from "@/hooks/useMutateMetadata";
import { useTransaction } from "@/hooks/useTransaction";
import { capturePostHogEvent } from "@/lib/posthog";
import { BADGE_ROLE_LABELS, CommunityBadgeRole } from "./badgeTypes";

interface UseUpdateBadgeProps {
  enabled?: boolean;
  communityId: string;
  badgeId?: string;
  badgeName?: string;
  /** Used for labeling in PostHog events, e.g. "manager", "assistant", "member" */
  badgeRole: CommunityBadgeRole;
  onSuccess?: (receipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export function useUpdateBadge({
  enabled = true,
  communityId,
  badgeId,
  badgeName,
  badgeRole,
  onSuccess,
  onError,
}: UseUpdateBadgeProps) {
  const registryAddress = useChainVar(contracts.communityRegistry);
  const { address } = useAccount();

  const uploadMetadata = useMutateMetadata({ onError });

  const hasArgs = !!communityId && !!badgeId && !!badgeName;

  const transaction = useTransaction({
    address: registryAddress,
    abi: CommunityRegistryAbi,
    functionName: "modifyBadge",
    args:
      enabled && hasArgs
        ? [BigInt(communityId), BigInt(badgeId), badgeName, ""]
        : undefined,
    enabled: enabled && hasArgs,
    simulate: enabled && hasArgs,
    waitForSync: true,
    successMessage: `${BADGE_ROLE_LABELS[badgeRole]} updated successfully`,
    queryKeysToInvalidateOnSuccess: [
      ["community", communityId],
      ["communities"],
      ["badge", badgeId],
      ["badges"],
      ["user", address?.toLowerCase()],
    ],
    onSuccess: (receipt) => {
      capturePostHogEvent(`community_${badgeRole}_badge_updated`, {
        community_id: communityId,
        badge_id: badgeId,
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
      });
      onSuccess?.(receipt);
    },
    onError,
  });

  const update = useCallback(
    async (
      badgeId: string,
      name: string,
      imageUrl: string | null,
      metadata: string,
    ) => {
      let uri = "";
      const hasMetadata = !!imageUrl || !!metadata;

      if (hasMetadata) {
        const metadataObj = {
          ...(metadata
            ? (JSON.parse(metadata) as Record<string, unknown>)
            : {}),
          imageUrl,
        };

        const res = await uploadMetadata.mutateAsync(metadataObj);
        uri = res.uris[0];
      }

      await transaction.execute({
        address: registryAddress,
        abi: CommunityRegistryAbi,
        functionName: "modifyBadge",
        args: [BigInt(communityId), BigInt(badgeId), name, uri],
      });
    },
    [communityId, registryAddress, transaction, uploadMetadata],
  );

  const reset = useCallback(() => {
    uploadMetadata.reset();
    transaction.reset();
  }, [transaction, uploadMetadata]);

  return {
    update,
    reset,
    isLoading: uploadMetadata.isPending || transaction.isLoading,
    isUploadingToIpfs: uploadMetadata.isPending,
    isWritingContract: transaction.isLoading,
    status: transaction.status,
    error: uploadMetadata.error ?? transaction.txReceipt.error,
    gas: transaction.gas,
    gasLoading: transaction.gasLoading,
    gasError: transaction.gasError,
  };
}
