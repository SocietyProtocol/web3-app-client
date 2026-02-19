import { useCallback } from "react";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useTransaction } from "@/hooks/useTransaction";
import { Hex, TransactionReceipt } from "viem";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

interface UseMintBadgeMutationProps {
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
}

interface BadgeMintData {
  id: bigint;
  recipients: Hex[];
}

export const useMintBadgeMutation = ({
  onSuccess,
  onError,
}: UseMintBadgeMutationProps) => {
  const contractAddress = useChainVar(contracts.badges);

  const transaction = useTransaction({
    successMessage: "Badge minted successfully",
    onSuccess,
    onError,
  });

  const mutate = useCallback(
    async (data: BadgeMintData) => {
      // Call the contract
      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "mintToMultiple",
        args: [data.recipients, data.id, BigInt(1), "0x"],
      });
    },
    [transaction, contractAddress],
  );

  return { mutate, transaction };
};
