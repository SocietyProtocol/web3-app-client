import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { useAccount } from "wagmi";
import { decodeBurnTransfer } from "@/data/badges/decodeUtils";

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
}: UseBurnBadgeMutationProps) => {
  const { address } = useAccount();
  return useTransaction({
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
      ["community-members"],
      ["community-members-infinite"],
    ],
    onSuccess: (receipt) => {
      const burn = decodeBurnTransfer(receipt);
      capturePostHogEvent("badge_burned", {
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
        badge_id: burn?.id.toString(),
        holder: burn?.from,
      });
      onSuccess?.(receipt);
    },
    onError,
  });
};

export default useBurnBadgeMutation;
