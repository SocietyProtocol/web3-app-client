import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { ProfileResponse } from "@/app/api/profile/route";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { useProfile } from "./useProfile";
import { AccountData } from "@/validation/account";
import { throwResponseError } from "@/utils/errors";
import { Address } from "viem";
import { useTransaction } from "@/hooks/useTransaction";

export const useProfileMutation = (overrideAddress?: Address) => {
  const chainId = useChainId();
  const contractAddress = getBadgesContractAddress(chainId);
  const { address } = useAccount();
  const userAddress = overrideAddress || address;
  const { generateAuthPayload } = useAuth();

  const profile = useProfile(userAddress);

  const uploadIpfsResult = useMutation<ProfileResponse, Error, AccountData>({
    mutationFn: async (data) => {
      // Generate authentication payload
      const authPayload = await generateAuthPayload();

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-payload": JSON.stringify(authPayload),
        },
        body: JSON.stringify({
          ...data,
        }),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      const responseData: ProfileResponse = await response.json();

      return responseData;
    },
  });

  const transaction = useTransaction({
    waitForSync: false,
  });

  const mutate = useCallback(
    async (data: AccountData) => {
      if (
        !profile.profileId.isFetched ||
        (profile.profileId.data !== BigInt(0) && !profile.uri.isFetched)
      ) {
        throw new Error("Profile data is still loading. Please try again.");
      }

      const profileExists =
        Boolean(profile.profileId.data) && profile.profileId.data !== BigInt(0);

      const ipfsData = await uploadIpfsResult.mutateAsync({
        ...data,
      });

      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: profileExists ? "updateProfileURI" : "createProfile",
        args: profileExists
          ? [profile.profileId.data!, ipfsData.uri]
          : [ipfsData.uri],
      });
    },
    [contractAddress, profile, uploadIpfsResult, transaction],
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
    username: profile.username,
    profileId: profile.profileId,
    profileUri: profile.uri,
    profileData: profile.profileData,
    isLoading:
      profile.profileId.isLoading ||
      profile.uri.isLoading ||
      profile.profileData.isLoading,
    isMutating,
    isUploadingToIpfs: uploadIpfsResult.isPending,
    isWritingContract: transaction.isExecuting,
    error,
    ipfsData: uploadIpfsResult.data,
    transactionReceipt: transaction.txReceipt.data,
    transactionHash: transaction.txHash,
    isTransactionPending: transaction.isLoading,
    isTransactionConfirmed: transaction.isSuccess,
    refetch: profile.refetch,
    mutate,
    reset,
  };
};
