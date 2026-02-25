import { useCallback } from "react";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

interface UseTransferBadgeMutationProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

interface BadgeTransferData {
  id: bigint;
  from: Hex;
  to: Hex;
}

export const useTransferBadgeMutation = ({
  onSuccess,
  onError,
}: UseTransferBadgeMutationProps) => {
  const contractAddress = useChainVar(contracts.badges);

  const queryClient = useQueryClient();

  const transaction = useTransaction({
    onSuccess,
    onError,
  });

  const mutate = useCallback(
    async (data: BadgeTransferData) => {
      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "safeTransferFrom",
        args: [data.from, data.to, data.id, BigInt(1), "0x"],
      });

      // Invalidate queries after transaction completes
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["badge", data.id.toString()],
        }),
        queryClient.invalidateQueries({ queryKey: ["user"] }),
      ]);
    },
    [transaction, contractAddress, queryClient],
  );

  return { mutate, transaction };
};

export default useTransferBadgeMutation;
