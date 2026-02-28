import { useCallback } from "react";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { useQueryClient } from "@tanstack/react-query";

interface BadgeBurnData {
  id: bigint;
  holder: Hex;
}

interface UseBurnBadgeMutationProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
  args?: BadgeBurnData;
}

export const useBurnBadgeMutation = ({
  onSuccess,
  onError,
  args,
}: UseBurnBadgeMutationProps) => {
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
    functionName: "burn",
    args: args ? [args.holder, args.id, BigInt(1)] : undefined,
    successMessage: "Badge burned successfully",
    onSuccess: handleSuccess,
    onError,
  });
};

export default useBurnBadgeMutation;
