import { useCallback } from "react";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { useQueryClient } from "@tanstack/react-query";

interface BadgeMintData {
  id: bigint;
  recipients: Hex[];
}

interface UseMintBadgeMutationProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
  args?: BadgeMintData;
}

export const useMintBadgeMutation = ({
  onSuccess,
  onError,
  args,
}: UseMintBadgeMutationProps) => {
  const queryClient = useQueryClient();
  const contractAddress = useChainVar(contracts.badges);

  const handleSuccess = useCallback(
    (transactionReceipt: TransactionReceipt) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["badge", args?.id] }),
        queryClient.invalidateQueries({ queryKey: ["user"] }),
      ]);
      onSuccess?.(transactionReceipt);
    },
    [queryClient, args?.id, onSuccess],
  );

  return useTransaction({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "mintToMultiple",
    args: args
      ? [args.recipients, args.id, BigInt(1), "0x" as const]
      : undefined,
    successMessage: "Badge minted successfully",
    onSuccess: handleSuccess,
    onError,
  });
};
