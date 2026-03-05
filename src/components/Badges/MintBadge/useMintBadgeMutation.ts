import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

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
}: UseMintBadgeMutationProps) =>
  useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "mintToMultiple",
    args: args
      ? [args.recipients, args.id, BigInt(1), "0x" as const]
      : undefined,
    successMessage: "Badge minted successfully",
    queryKeysToInvalidateOnSuccess: [["badge", args?.id], ["user"]],
    onSuccess,
    onError,
  });
