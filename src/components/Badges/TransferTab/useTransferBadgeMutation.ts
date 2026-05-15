import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { useAccount } from "wagmi";
import { decodeBadgeTransfer } from "@/data/badges/decodeUtils";

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
}: UseTransferBadgeMutationProps) => {
  const { address } = useAccount();
  return useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "safeTransferFrom",
    args: args
      ? [args.from, args.to, args.id, BigInt(1), "0x" as const]
      : undefined,
    successMessage: "Badge transferred successfully",
    queryKeysToInvalidateOnSuccess: [["badge", args?.id.toString()], ["user"]],
    onSuccess: (receipt) => {
      const transfer = decodeBadgeTransfer(receipt);
      capturePostHogEvent("badge_transferred", {
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
        badge_id: transfer?.id.toString(),
        from: transfer?.from,
        to: transfer?.to,
      });
      onSuccess?.(receipt);
    },
    onError,
  });
};
