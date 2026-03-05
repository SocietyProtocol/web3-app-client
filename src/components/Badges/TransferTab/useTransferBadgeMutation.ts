import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

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
}: UseTransferBadgeMutationProps) =>
  useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "safeTransferFrom",
    args: args
      ? [args.from, args.to, args.id, BigInt(1), "0x" as const]
      : undefined,
    successMessage: "Badge transferred successfully",
    queryKeysToInvalidateOnSuccess: [["badge", args?.id], ["user"]],
    onSuccess,
    onError,
  });
