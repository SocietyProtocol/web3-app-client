import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { ProfileResponse } from "@/app/api/profile/route";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { AccountData } from "@/validation/account";
import { throwResponseError } from "@/utils/errors";
import { Address } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { useUserQuery } from "@/data/users/useUserQuery";

export const useProfileMutation = (overrideAddress?: Address) => {
  const queryClient = useQueryClient();
  const contractAddress = useChainVar(contracts.badges);
  const { address } = useAccount();
  const userAddress = overrideAddress || address;
  const { generateAuthPayload } = useAuth();

  const user = useUserQuery(userAddress);

  const username = useMemo(
    () =>
      user.data?.name ||
      (userAddress
        ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
        : "Unknown User"),
    [user.data?.name, userAddress],
  );

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
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["user", userAddress?.toLowerCase()],
        }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]);
    },
  });

  const mutate = useCallback(
    async (data: AccountData) => {
      if (user.isLoading) {
        throw new Error("Profile data is still loading. Please try again.");
      }

      const profileExists = Boolean(user.data?.profile);

      const ipfsData = await uploadIpfsResult.mutateAsync({
        ...data,
      });

      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: profileExists ? "updateProfileURI" : "createProfile",
        args: profileExists
          ? [user.data?.profile?.id, ipfsData.uri]
          : [ipfsData.uri],
      });
    },
    [user, uploadIpfsResult, transaction, contractAddress],
  );

  const reset = useCallback(() => {
    uploadIpfsResult.reset();
    transaction.reset();
  }, [uploadIpfsResult, transaction]);

  const error =
    uploadIpfsResult.error ||
    (transaction.isError ? new Error("Transaction failed") : null);

  return {
    username,
    user,
    transaction,
    isUploadingToIpfs: uploadIpfsResult.isPending,
    error,
    mutate,
    reset,
  };
};
