import { useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { BadgeTransformedData } from "@/validation/badge";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { throwResponseError } from "@/utils/errors";
import { UploadMetadataResponse } from "@/app/api/upload-metadata/route";
import { getBadgesContractAddress } from "@/lib/wagmi";

export const useMutateBadge = () => {
  const { chainId } = useAccount();
  const contractAddress = getBadgesContractAddress(chainId);
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

  const {
    data: hash,
    writeContractAsync,
    isPending: isWritingContract,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    data: transactionReceipt,
    isLoading: isTransactionPending,
    isSuccess: isTransactionConfirmed,
    error: transactionError,
  } = useWaitForTransactionReceipt({
    hash,
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
      await writeContractAsync({
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
    [contractAddress, uploadIpfsResult, writeContractAsync],
  );

  const reset = useCallback(() => {
    uploadIpfsResult.reset();
    resetWrite();
  }, [resetWrite, uploadIpfsResult]);

  const error = uploadIpfsResult.error || writeError || transactionError;
  const isMutating =
    uploadIpfsResult.isPending || isWritingContract || isTransactionPending;

  return {
    mutate,
    isUploadingToIpfs: uploadIpfsResult.isPending,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    isMutating,
    error,
    reset,
    transactionHash: hash,
    transactionReceipt,
  };
};
