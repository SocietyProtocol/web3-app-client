import { useCallback, useMemo } from "react";
import { CommunityTransformedData } from "@/validation/community";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";
import { useTransaction } from "@/hooks/useTransaction";
import { TransactionReceipt } from "viem";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { useMutateMetadata } from "@/hooks/useMutateMetadata";

interface UseMutateCommunityProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export const useMutateCommunity = ({
  onSuccess,
  onError,
}: UseMutateCommunityProps) => {
  const contractAddress = useChainVar(contracts.communityRegistry);

  const uploadIpfsResult = useMutateMetadata({
    onError,
  });

  const queryKeysToInvalidateOnSuccess = useMemo(
    () => [["communities"], ["community"]],
    [],
  );

  const transaction = useTransaction({
    waitForSync: true,
    successMessage: "Community created successfully",
    queryKeysToInvalidateOnSuccess,
    onSuccess: (transactionReceipt) => {
      capturePostHogEvent("community_created", {
        tx_hash: transactionReceipt.transactionHash,
      });
      onSuccess?.(transactionReceipt);
    },
    onError,
  });

  const mutate = useCallback(
    async (data: CommunityTransformedData) => {
      // Build manager badge metadata
      const creatorMetadata: Record<string, unknown> = {
        imageUrl: data.creatorBadgeImageUrl,
      };

      // Build member badge metadata
      const memberMetadata: Record<string, unknown> = {
        imageUrl: data.memberBadgeImageUrl,
      };

      // Upload both in a single authenticated request (one signature)
      const { uris } = await uploadIpfsResult.mutateAsync([
        creatorMetadata,
        memberMetadata,
      ]);

      const [creatorBadgeURI, memberBadgeURI] = uris;

      await transaction.execute({
        address: contractAddress,
        abi: CommunityRegistryAbi,
        functionName: "createCommunity",
        args: [data.name, data.description, creatorBadgeURI, memberBadgeURI],
      });
    },
    [transaction, contractAddress, uploadIpfsResult],
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
    reset,
    isMutating,
    isUploadingToIpfs: uploadIpfsResult.isPending,
    isWritingContract: transaction.isExecuting,
    isTransactionPending: transaction.isLoading,
    isSyncing: transaction.isSyncing,
    error,
  };
};
