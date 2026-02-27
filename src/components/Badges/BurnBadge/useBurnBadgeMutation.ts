import { useCallback } from "react";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

interface UseBurnBadgeMutationProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

interface BadgeBurnData {
  id: bigint;
  holder: Hex;
}

export const useBurnBadgeMutation = ({
  onSuccess,
  onError,
}: UseBurnBadgeMutationProps) => {
  const contractAddress = useChainVar(contracts.badges);

  const transaction = useTransaction({
    onSuccess,
    onError,
    successMessage: "Badge burned successfully",
  });

  const mutate = useCallback(
    async (data: BadgeBurnData) => {
      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "burn",
        args: [data.holder, data.id, BigInt(1)],
      });
    },
    [transaction, contractAddress],
  );

  return { mutate, transaction };
};

export default useBurnBadgeMutation;
