import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { Hex, TransactionReceipt } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useTransaction } from "@/hooks/useTransaction";

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
  const { chainId } = useAccount();
  const contractAddress = useMemo(
    () => getBadgesContractAddress(chainId),
    [chainId],
  );

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
