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
  successMessage?: string;
  onSuccess?: (transactionReceipt: TransactionReceipt) => void;
  onError?: (error: unknown) => void;
  args?: BadgeBurnData;
}

export const useBurnBadgeMutation = ({
  onSuccess,
  onError,
  args,
  successMessage = "Badge burned successfully",
}: UseBurnBadgeMutationProps) =>
  useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "burn",
    args: args ? [args.holder, args.id, BigInt(1)] : undefined,
    successMessage,
    queryKeysToInvalidateOnSuccess: [
      ["badge", args?.id.toString()],
      ["user"],
      ["communities"],
      ["community"],
      ["communityMembers"],
      ["communityMembersInfinite"],
    ],
    onSuccess,
    onError,
  });

export default useBurnBadgeMutation;
