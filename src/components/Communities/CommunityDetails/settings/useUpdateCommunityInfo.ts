import { useCallback } from "react";
import { TransactionReceipt } from "viem";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useTransaction } from "@/hooks/useTransaction";

interface UseUpdateCommunityInfoProps {
  communityId: string;
  name?: string;
  description?: string;
  onSuccess?: (receipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

export function useUpdateCommunityInfo({
  communityId,
  name,
  description,
  onSuccess,
  onError,
}: UseUpdateCommunityInfoProps) {
  const registryAddress = useChainVar(contracts.communityRegistry);

  const hasArgs = !!name && name.length > 0 && description !== undefined;

  const transaction = useTransaction({
    address: registryAddress,
    abi: CommunityRegistryAbi,
    functionName: "updateCommunityDetails",
    args: hasArgs ? [BigInt(communityId), name, description] : undefined,
    simulate: hasArgs,
    waitForSync: true,
    successMessage: "Community info updated successfully",
    queryKeysToInvalidateOnSuccess: [
      ["community", communityId],
      ["communities"],
    ],
    onSuccess,
    onError,
  });

  const update = useCallback(
    (name: string, description: string) =>
      transaction.execute({
        address: registryAddress,
        abi: CommunityRegistryAbi,
        functionName: "updateCommunityDetails",
        args: [BigInt(communityId), name, description],
      }),
    [communityId, registryAddress, transaction],
  );

  return { update, ...transaction };
}
