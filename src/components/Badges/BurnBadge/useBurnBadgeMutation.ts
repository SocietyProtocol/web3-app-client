import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

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
}: UseBurnBadgeMutationProps) =>
  useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "burn",
    args: args ? [args.holder, args.id, BigInt(1)] : undefined,
    successMessage: "Badge burned successfully",
    queryKeysToInvalidateOnSuccess: [["badge", args?.id], ["user"]],
    onSuccess,
    onError,
  });

export default useBurnBadgeMutation;
