import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { useTransaction } from "@/hooks/useTransaction";
import { Hex, TransactionReceipt } from "viem";

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
  const { chainId } = useAccount();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId],
  );

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
