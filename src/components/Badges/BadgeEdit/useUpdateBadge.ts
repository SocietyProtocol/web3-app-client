import { useCallback } from "react";
import { BadgeEditTransformedData } from "@/validation/badgeEdit";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { throwResponseError } from "@/utils/errors";
import { UploadMetadataResponse } from "@/app/api/upload-metadata/route";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { useBadge } from "@/data/badges/useBadge";
import { useTransaction } from "@/hooks/useTransaction";

interface UseUpdateBadgeProps {
  badgeId: string;
}

export const useUpdateBadge = ({ badgeId }: UseUpdateBadgeProps) => {
  const contractAddress = useChainVar(contracts.badges);
  const { data: badgeData, refetch } = useBadge(badgeId);

  const { generateAuthPayload } = useAuth();

  const uploadIpfsResult = useMutation<
    UploadMetadataResponse,
    Error,
    BadgeEditTransformedData
  >({
    mutationFn: async (data) => {
      const authPayload = await generateAuthPayload();

      const metadata = {
        imageUrl: data.imageUrl,
        ...(data.metadata ? JSON.parse(data.metadata) : {}),
      };

      const response = await fetch("/api/upload-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-payload": JSON.stringify(authPayload),
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      const responseData: UploadMetadataResponse = await response.json();

      return responseData;
    },
  });

  const transaction = useTransaction({
    waitForSync: true,
  });

  const mutate = useCallback(
    async (data: BadgeEditTransformedData) => {
      if (!badgeData?.badge) {
        throw new Error("Badge data not available");
      }

      const hasMetadata = !!data.imageUrl || !!data.metadata;

      let uri = "";
      if (hasMetadata) {
        const ipfsData = await uploadIpfsResult.mutateAsync(data);
        uri = ipfsData.uri;
      }

      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "modifyBadge",
        args: [
          BigInt(badgeId),
          data.name,
          data.isOfficial,
          data.isCommunity,
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
    (transaction.isError ? new Error("Transaction failed") : null);
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
    refetch,
    mutate,
    reset,
  };
};
