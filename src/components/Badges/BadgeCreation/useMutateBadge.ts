import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { BadgeTransformedData } from "@/validation/badge";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { throwResponseError } from "@/utils/errors";
import { UploadMetadataResponse } from "@/app/api/upload-metadata/route";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useTransaction } from "@/hooks/useTransaction";

export const useMutateBadge = () => {
  const { chainId } = useAccount();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId],
  );
  const { generateAuthPayload } = useAuth();

  const uploadIpfsResult = useMutation<
    UploadMetadataResponse,
    Error,
    BadgeTransformedData
  >({
    mutationFn: async (data) => {
      // Generate authentication payload
      const authPayload = await generateAuthPayload();

      const response = await fetch("/api/upload-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-payload": JSON.stringify(authPayload),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      const responseData = await response.json();

      return responseData;
    },
  });

  const transaction = useTransaction({
    waitForSync: false,
    successMessage: "Badge created successfully",
  });

  const mutate = useCallback(
    async (data: BadgeTransformedData) => {
      const metadata = {
        imageUrl: data.imageUrl,
        ...(data.metadata ? JSON.parse(data.metadata) : {}),
      };

      // Upload metadata to IPFS first
      const ipfsData = await uploadIpfsResult.mutateAsync(metadata);

      if (!ipfsData.uri) {
        throw new Error("IPFS upload did not return a valid URI");
      }

      // Call the contract
      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "createBadge",
        args: [
          data.name,
          data.isOfficial,
          data.isCommunity,
          ipfsData.uri,
          data.minters,
          data.transferers,
          data.burners,
          data.editors,
        ],
      });
    },
    [contractAddress, uploadIpfsResult, transaction],
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
    isMutating,
    error,
    reset,
    transactionHash: transaction.txHash,
    transactionReceipt: transaction.txReceipt.data,
  };
};
