import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { AccountResponse } from "@/app/api/account/route";
import { ValidationError } from "@/errors/ValidationError";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { Hex } from "viem";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useProfile } from "./useProfile";
import { AccountData } from "@/validation/account";

export const useMutateProfile = (overrideAddress?: Hex) => {
  const chainId = useChainId();
  const contractAddress = getBadgesContractAddress(chainId);
  const { address } = useAccount();
  const userAddress = overrideAddress || address;

  const profile = useProfile(userAddress);

  const uploadIpfsResult = useMutation<AccountResponse, Error, AccountData>({
    mutationFn: async (data) => {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 400 && errorData?.details) {
          throw new ValidationError("Validation failed", errorData.details);
        }

        throw new Error(errorData?.error || "Failed to upload profile data");
      }

      return response.json() as Promise<AccountResponse>;
    },
  });

  const writeContract = useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash: writeContract.data,
    confirmations: 1,
  });

  const mutate = async (data: AccountData) => {
    if (
      !profile.profileId.isFetched ||
      (profile.profileId.data !== BigInt(0) && !profile.uri.isFetched)
    ) {
      throw new Error("Profile data is still loading. Please try again.");
    }

    const profileExists =
      Boolean(profile.profileId.data) && profile.profileId.data !== BigInt(0);

    const uriExists = Boolean(profile.uri.data && profile.uri.data.length > 0);

    const ipfsData = await uploadIpfsResult.mutateAsync({
      ...data,
      cid: uriExists ? profile.uri.data! : undefined,
    });

    return await writeContract.writeContractAsync({
      address: contractAddress,
      abi: SocietyProtocolBadgesABI,
      functionName: profileExists ? "updateProfileURI" : "createProfile",
      args: profileExists
        ? [profile.profileId.data!, ipfsData.cid]
        : [ipfsData.cid],
    });
  };

  const reset = useCallback(() => {
    uploadIpfsResult.reset();
    writeContract.reset();
  }, [uploadIpfsResult, writeContract]);

  return {
    profileId: profile.profileId,
    profileUri: profile.uri,
    profileData: profile.profileData,
    isLoading:
      profile.profileId.isLoading ||
      profile.uri.isLoading ||
      profile.profileData.isLoading,
    isMutating:
      uploadIpfsResult.isPending ||
      writeContract.isPending ||
      Boolean(writeContract.data && receipt.isPending),
    isUploadingToIpfs: uploadIpfsResult.isPending,
    isWritingContract: writeContract.isPending,
    error: uploadIpfsResult.error || writeContract.error || receipt.error,
    ipfsData: uploadIpfsResult.data,
    transactionReceipt: receipt.data,
    transactionHash: writeContract.data,
    isTransactionPending: Boolean(writeContract.data && receipt.isPending),
    isTransactionConfirmed: Boolean(receipt.data && receipt.isSuccess),
    refetch: profile.refetch,
    mutate,
    reset,
  };
};
