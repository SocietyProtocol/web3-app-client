import { useCallback, useRef } from "react";
import { BadgeTransformedData } from "@/validation/badge";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useMutateMetadata } from "@/hooks/useMutateMetadata";
import { useTransaction } from "@/hooks/useTransaction";
import { TransactionReceipt, zeroAddress } from "viem";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";

interface UseMutateBadgeProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
  communityId?: string;
}

export const useMutateBadge = ({
  onSuccess,
  onError,
  communityId,
}: UseMutateBadgeProps) => {
  const contractAddress = useChainVar(
    communityId ? contracts.communityRegistry : contracts.badges,
  );

  const pendingBadgeEventRef = useRef<BadgeTransformedData | null>(null);

  const uploadIpfsResult = useMutateMetadata({ onError });

  const transaction = useTransaction({
    waitForSync: true,
    successMessage: "Badge created successfully",
    queryKeysToInvalidateOnSuccess: [
      ["badges"],
      ["badge"],
      ...(communityId ? [["community", communityId], ["communities"]] : []),
    ],
    onSuccess: (transactionReceipt) => {
      const pendingBadgeEvent = pendingBadgeEventRef.current;

      if (pendingBadgeEvent) {
        capturePostHogEvent("badge_created", {
          badge_name: pendingBadgeEvent.name,
          has_image: Boolean(pendingBadgeEvent.imageUrl),
          has_metadata: Boolean(pendingBadgeEvent.metadata),
          is_official: pendingBadgeEvent.isOfficial,
          editor_count: pendingBadgeEvent.editors.length,
          is_community: Boolean(communityId),
          community_id: communityId,
          tx_hash: transactionReceipt.transactionHash,
        });
      }

      pendingBadgeEventRef.current = null;
      onSuccess?.(transactionReceipt);
    },
    onError,
  });

  const mutate = useCallback(
    async (data: BadgeTransformedData) => {
      pendingBadgeEventRef.current = data;
      const hasMetadata = !!data.imageUrl || !!data.metadata;

      let uri = "";
      if (hasMetadata) {
        const metadata = {
          imageUrl: data.imageUrl,
          ...(data.metadata ? JSON.parse(data.metadata) : {}),
        } as Record<string, unknown>;

        const res = await uploadIpfsResult.mutateAsync([metadata]);
        uri = res.uris[0];
      }

      // Call the contract
      if (communityId) {
        await transaction.execute({
          address: contractAddress,
          abi: CommunityRegistryAbi,
          functionName: "createCommunityBadge",
          args: [
            BigInt(communityId),
            data.name,
            uri,
            data.minters,
            data.transferers,
            data.burners,
          ],
        });
      } else {
        await transaction.execute({
          address: contractAddress,
          abi: SocietyProtocolBadgesABI,
          functionName: "createBadge",
          args: [
            data.name,
            data.isOfficial,
            false,
            zeroAddress,
            uri,
            data.minters,
            data.transferers,
            data.burners,
            data.editors,
          ],
        });
      }
    },
    [communityId, transaction, contractAddress, uploadIpfsResult],
  );

  const reset = useCallback(() => {
    uploadIpfsResult.reset();
    transaction.reset();
  }, [transaction, uploadIpfsResult]);

  const error =
    uploadIpfsResult.error ||
    (transaction.isError ? new Error("Transaction failed") : null);

  const isMutating = uploadIpfsResult.isPending || transaction.isLoading;

  return {
    mutate,
    isUploadingToIpfs: uploadIpfsResult.isPending,
    isWritingContract: transaction.isExecuting,
    isTransactionPending: transaction.isLoading,
    isTransactionConfirmed: transaction.isSuccess,
    isSyncing: transaction.isSyncing,
    isMutating,
    error,
    reset,
    transactionHash: transaction.txHash,
    transactionReceipt: transaction.txReceipt.data,
  };
};
