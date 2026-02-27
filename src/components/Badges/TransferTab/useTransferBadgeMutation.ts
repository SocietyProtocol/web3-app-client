import { useCallback } from "react";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
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

  const transaction = useTransaction({
    onSuccess,
    onError,
    successMessage: "Badge transferred successfully",
  });

  const mutate = useCallback(
    async (data: BadgeTransferData) => {
      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "safeTransferFrom",
        args: [data.from, data.to, data.id, BigInt(1), "0x"],
      });
    },
    [transaction, contractAddress],
  );

  return { mutate, transaction };
};

export default useTransferBadgeMutation;
