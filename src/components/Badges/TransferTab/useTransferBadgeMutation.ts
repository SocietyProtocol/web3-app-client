import { useCallback } from "react";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { useQueryClient } from "@tanstack/react-query";

interface BadgeTransferData {
  id: bigint;
  from: Hex;
  to: Hex;
}

interface UseTransferBadgeMutationProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
  args?: BadgeTransferData;
}

export const useTransferBadgeMutation = ({
  onSuccess,
  onError,
  args,
}: UseTransferBadgeMutationProps) => {
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
    functionName: "safeTransferFrom",
    args: args
      ? [args.from, args.to, args.id, BigInt(1), "0x" as const]
      : undefined,
    successMessage: "Badge transferred successfully",
    onSuccess: handleSuccess,
    onError,
  });
};
