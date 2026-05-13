import { useCallback } from "react";
import { TransactionReceipt } from "viem";
import { useAccount } from "wagmi";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useTransaction } from "@/hooks/useTransaction";
import { capturePostHogEvent } from "@/lib/posthog";

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
  const { address } = useAccount();

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
    onSuccess: (receipt) => {
      capturePostHogEvent("community_info_updated", {
        community_id: communityId,
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
      });
      onSuccess?.(receipt);
    },
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
