import { useCallback } from "react";
import { BadgeEditTransformedData } from "@/validation/badgeEdit";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useMutateMetadata } from "@/hooks/useMutateMetadata";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { useBadge } from "@/data/badges/useBadge";
import { useTransaction } from "@/hooks/useTransaction";
import { capturePostHogEvent } from "@/lib/posthog";
import { useAccount } from "wagmi";
import { decodeBadgeModified } from "@/data/badges/decodeUtils";

interface UseUpdateBadgeProps {
  badgeId: string;
}

export const useUpdateBadge = ({ badgeId }: UseUpdateBadgeProps) => {
  const contractAddress = useChainVar(contracts.badges);
  const { address } = useAccount();
  const { data: badgeData } = useBadge(badgeId);

  const uploadIpfsResult = useMutateMetadata({ showNotifications: false });

  const transaction = useTransaction({
    waitForSync: true,
    queryKeysToInvalidateOnSuccess: [["badge", badgeId], ["badges"]],
    onSuccess: (receipt) => {
      const modified = decodeBadgeModified(receipt);
      capturePostHogEvent("badge_updated", {
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
        badge_id: badgeId,
        badge_name: modified?.name,
        has_metadata: Boolean(modified?.metadataURI),
      });
    },
  });

  const mutate = useCallback(
    async (data: BadgeEditTransformedData) => {
      if (!badgeData?.badge) {
        throw new Error("Badge data not available");
      }

      const hasMetadata = !!data.imageUrl || !!data.metadata;

      let uri = "";
      if (hasMetadata) {
        const metadata = {
          imageUrl: data.imageUrl,
          ...(data.metadata ? JSON.parse(data.metadata) : {}),
        } as Record<string, unknown>;

        const ipfsData = await uploadIpfsResult.mutateAsync([metadata]);
        uri = ipfsData.uris[0];
      }

      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "modifyBadge",
        args: [
          BigInt(badgeId),
          data.name,
          data.isOfficial,
          badgeData.badge.isCommunity,
          uri,
        ],
      });
    },
    [contractAddress, badgeData, badgeId, uploadIpfsResult, transaction],
  );

  const reset = useCallback(() => {
    uploadIpfsResult.reset();
    transaction.reset();
  }, [uploadIpfsResult, transaction]);

  const error =
    uploadIpfsResult.error ||
    (transaction.isError
      ? (transaction.txReceipt.error ?? new Error("Transaction failed"))
      : null);
  const isMutating = uploadIpfsResult.isPending || transaction.isLoading;

  return {
    isMutating,
    isUploadingToIpfs: uploadIpfsResult.isPending,
    isWritingContract: transaction.isExecuting,
    error,
    ipfsData: uploadIpfsResult.data,
    transactionReceipt: transaction.txReceipt.data,
    transactionHash: transaction.txHash,
    isTransactionPending: transaction.isLoading,
    isTransactionConfirmed: transaction.isSuccess,
    mutate,
    reset,
  };
};
