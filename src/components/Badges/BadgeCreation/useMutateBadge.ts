import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { BadgeTransformedData } from "@/validation/badge";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { parseErrorMessage, throwResponseError } from "@/utils/errors";
import { UploadMetadataResponse } from "@/app/api/upload-metadata/route";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useTransaction } from "@/hooks/useTransaction";
import { TransactionReceipt, zeroAddress } from "viem";
import { useSnackbar } from "notistack";

interface UseMutateBadgeProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export const useMutateBadge = ({ onSuccess, onError }: UseMutateBadgeProps) => {
  const { chainId } = useAccount();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId],
  );
  const { generateAuthPayload } = useAuth();

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

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
    onMutate: () => {
      enqueueSnackbar("Uploading metadata to IPFS...", {
        variant: "info",
        key: "ipfs-upload",
        persist: true,
      });
    },

    onError: (error) => {
      closeSnackbar("ipfs-upload");
      const message = parseErrorMessage(error);

      enqueueSnackbar(message, { variant: "error", key: "ipfs-upload-error" });
      onError?.(error);
    },
    onSuccess: () => {
      closeSnackbar("ipfs-upload");

      enqueueSnackbar("Metadata uploaded to IPFS", {
        variant: "success",
        key: "ipfs-upload-success",
      });
    },
  });

  const transaction = useTransaction({
    waitForSync: true,
    successMessage: "Badge created successfully",
    onSuccess,
    onError,
  });

  const mutate = useCallback(
    async (data: BadgeTransformedData) => {
      const metadata = {
        imageUrl: data.imageUrl,
        ...(data.metadata ? JSON.parse(data.metadata) : {}),
      };

      let uri: string;

      try {
        const res = await uploadIpfsResult.mutateAsync(metadata);
        uri = res.uri;
      } catch (error) {
        console.error("Error uploading metadata to IPFS:", error);
        onError?.(error);
        return;
      }

      if (!uri) {
        console.error("No URI returned from IPFS upload");
        onError?.(new Error("Failed to upload metadata to IPFS"));
        return;
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
          zeroAddress,
          uri,
          data.minters,
          data.transferers,
          data.burners,
          data.editors,
        ],
      });
    },
    [transaction, contractAddress, uploadIpfsResult, onError],
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
