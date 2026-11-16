import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { decodeBadgeTransfer } from "@/data/badges/decodeUtils";
import { transferBadgeCallArgs } from "../badgeAmount";

interface BadgeTransferData {
  id: bigint;
  from: Hex;
  to: Hex;
  /** Copies to transfer; at most the sender's balance. */
  amount: bigint;
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
  const { address } = useOutpostAccount();
  return useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "safeTransferFrom",
    args: args ? transferBadgeCallArgs(args) : undefined,
    successMessage: "Badge transferred successfully",
    queryKeysToInvalidateOnSuccess: [
      ["badge", args?.id.toString()],
      ["user"],
      // On-chain balances (holder amounts, the transfer tab's maximum).
      ["readContract"],
      ["readContracts"],
    ],
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
