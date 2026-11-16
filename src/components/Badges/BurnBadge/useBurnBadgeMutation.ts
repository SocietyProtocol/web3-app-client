import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { decodeBurnTransfer } from "@/data/badges/decodeUtils";
import { burnBadgeCallArgs } from "../badgeAmount";

interface BadgeBurnData {
  id: bigint;
  holder: Hex;
  /** Copies to burn (default 1); at most the holder's balance. */
  amount?: bigint;
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
  const { address } = useOutpostAccount();
  return useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "burn",
    args: args ? burnBadgeCallArgs(args) : undefined,
    successMessage,
    queryKeysToInvalidateOnSuccess: [
      ["badge", args?.id.toString()],
      ["user"],
      ["communities"],
      ["community"],
      ["community-members"],
      ["community-members-infinite"],
      // On-chain balances (holder amounts, the burn tab's maximum).
      ["readContract"],
      ["readContracts"],
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
