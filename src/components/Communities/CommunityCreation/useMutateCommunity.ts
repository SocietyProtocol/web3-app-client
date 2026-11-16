import { useCallback, useMemo } from "react";
import { CommunityTransformedData } from "@/validation/community";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";
import { useTransaction } from "@/hooks/useTransaction";
import { TransactionReceipt } from "viem";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { PREVIEW_METADATA_URI, WritePayment } from "@/lib/payment-label";
import { useMutateMetadata } from "@/hooks/useMutateMetadata";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { decodeCommunityDetailsUpdated } from "@/data/communities/decodeUtils";

interface UseMutateCommunityProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export const useMutateCommunity = ({
  onSuccess,
  onError,
}: UseMutateCommunityProps) => {
  const contractAddress = useChainVar(contracts.communityRegistry);
  const { address } = useOutpostAccount();

  const uploadIpfsResult = useMutateMetadata({
    onError,
  });

  const queryKeysToInvalidateOnSuccess = useMemo(
    () => [["communities"], ["community"]],
    [],
  );

  // The real call needs the uploaded badge URIs; preview a minimal
  // community so the button can say who pays and about how much.
  const preview = useMemo(
    () => ({
      address: contractAddress,
      abi: CommunityRegistryAbi,
      functionName: "createCommunity",
      args: [
        "Community",
        "Community",
        PREVIEW_METADATA_URI,
        PREVIEW_METADATA_URI,
        PREVIEW_METADATA_URI,
      ],
    }),
    [contractAddress],
  );

  const transaction = useTransaction({
    preview,
    waitForSync: true,
    successMessage: "Community created successfully",
    queryKeysToInvalidateOnSuccess,
    onSuccess: (transactionReceipt) => {
      const detailsUpdated = decodeCommunityDetailsUpdated(transactionReceipt);

      capturePostHogEvent("community_created", {
        wallet_address: address?.toLowerCase(),
        tx_hash: transactionReceipt.transactionHash,
        community_name: detailsUpdated?.name,
        community_id: detailsUpdated?.communityId?.toString(),
        community_description: detailsUpdated?.description,
      });
      onSuccess?.(transactionReceipt);
    },
    onError,
  });

  const mutate = useCallback(
    async (data: CommunityTransformedData) => {
      const creatorMetadata: Record<string, unknown> = {
        ...data.creatorBadgeMetadata,
        imageUrl: data.creatorBadgeImageUrl,
      };

      // Build assistant badge metadata
      const assistantMetadata: Record<string, unknown> = {
        ...data.assistantBadgeMetadata,
        imageUrl: data.assistantBadgeImageUrl,
      };

      // Build member badge metadata
      const memberMetadata: Record<string, unknown> = {
        ...data.memberBadgeMetadata,
        imageUrl: data.memberBadgeImageUrl,
      };

      // Upload all three in a single authenticated request (one signature)
      const { uris } = await uploadIpfsResult.mutateAsync([
        creatorMetadata,
        assistantMetadata,
        memberMetadata,
      ]);

      const [creatorBadgeURI, assistantBadgeURI, memberBadgeURI] = uris;

      await transaction.execute({
        address: contractAddress,
        abi: CommunityRegistryAbi,
        functionName: "createCommunity",
        args: [
          data.name,
          data.description,
          creatorBadgeURI,
          assistantBadgeURI,
          memberBadgeURI,
        ],
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

  const { routeKind, gas, gasLoading, gasError } = transaction;
  const payment = useMemo<WritePayment>(
    () => ({ routeKind, gas, gasLoading, gasError }),
    [routeKind, gas, gasLoading, gasError],
  );

  return {
    mutate,
    payment,
    reset,
    isMutating,
    isUploadingToIpfs: uploadIpfsResult.isPending,
    isWritingContract: transaction.isExecuting,
    isTransactionPending: transaction.isLoading,
    isSyncing: transaction.isSyncing,
    error,
  };
};
