import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { AccountData, AccountResponse } from "@/app/api/account/route";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useMutation } from "@tanstack/react-query";
import { Hex } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

export const useUpdateProfile = (overrideAddress?: Hex) => {
  const chainId = useChainId();
  const contractAddress = getBadgesContractAddress(chainId);
  const { address } = useAccount();
  const userAddress = overrideAddress || address;

  const profileIdResult = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "userProfileId",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && contractAddress),
    },
  });

  const profileUriResult = useReadContract({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "uri",
    args: profileIdResult.data ? [profileIdResult.data] : undefined,
    query: {
      enabled: Boolean(
        profileIdResult.data &&
          profileIdResult.data !== BigInt(0) &&
          contractAddress
      ),
    },
  });

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
        throw new Error(
          errorData?.error || "Failed to create profile. Please try again."
        );
      }

      return response.json() as Promise<AccountResponse>;
    },
  });

  const writeContract = useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash: writeContract.data,
    confirmations: 1,
  });

  const exec = async (data: AccountData) => {
    if (!profileIdResult.isFetched || !profileUriResult.isFetched) return;

    const profileExists =
      Boolean(profileIdResult.data) && profileIdResult.data !== BigInt(0);

    const uriExists = Boolean(
      profileUriResult.data && profileUriResult.data.length > 0
    );

    const ipfsData = await uploadIpfsResult.mutateAsync({
      ...data,
      cid: uriExists ? profileUriResult.data! : undefined,
    });

    return await writeContract.writeContractAsync({
      address: contractAddress,
      abi: SocietyProtocolBadgesABI,
      functionName: profileExists ? "updateProfileURI" : "createProfile",
      args: profileExists
        ? [profileIdResult.data!, ipfsData.cid]
        : [ipfsData.cid],
    });
  };

  return {
    createProfile: exec,
    isLoading: profileIdResult.isLoading || profileUriResult.isLoading,
    isMutating:
      uploadIpfsResult.isPending ||
      writeContract.isPending ||
      (writeContract.data && receipt.isPending),
    error: uploadIpfsResult.error || writeContract.error || receipt.error,
    ipfsData: uploadIpfsResult.data,
    transactionReceipt: receipt.data,
    transactionHash: writeContract.data,
    isTransactionPending: Boolean(writeContract.data && receipt.isPending),
    isTransactionConfirmed: Boolean(receipt.data && receipt.isSuccess),
  };
};
