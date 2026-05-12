import { useCallback } from "react";
import { TransactionReceipt } from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useMutateMetadata } from "@/hooks/useMutateMetadata";
import { useTransaction } from "@/hooks/useTransaction";

interface UseUpdateManagerBadgeProps {
  communityId: string;
  badgeId?: string;
  badgeName?: string;
  onSuccess?: (receipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export function useUpdateManagerBadge({
  communityId,
  badgeId,
  badgeName,
  onSuccess,
  onError,
}: UseUpdateManagerBadgeProps) {
  const badgesAddress = useChainVar(contracts.badges);

  const uploadMetadata = useMutateMetadata({ onError });

  const hasArgs = !!badgeId && !!badgeName;

  const transaction = useTransaction({
    address: badgesAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "modifyBadge",
    args: hasArgs ? [BigInt(badgeId), badgeName, false, true, ""] : undefined,
    simulate: hasArgs,
    waitForSync: true,
    successMessage: "Manager badge updated successfully",
    queryKeysToInvalidateOnSuccess: [["community", communityId], ["badge"]],
    onSuccess,
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
          imageUrl,
          ...(metadata ? JSON.parse(metadata) : {}),
        } as Record<string, unknown>;

        const res = await uploadMetadata.mutateAsync(metadataObj);
        uri = res.uris[0];
      }

      await transaction.execute({
        address: badgesAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "modifyBadge",
        args: [BigInt(badgeId), name, false, true, uri],
      });
    },
    [badgesAddress, transaction, uploadMetadata],
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
