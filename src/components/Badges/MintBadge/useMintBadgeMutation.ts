import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { Hex, TransactionReceipt } from "viem";
import { useTransaction } from "@/hooks/useTransaction";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { capturePostHogEvent } from "@/lib/posthog";
import { useAccount } from "wagmi";
import { decodeMintTransfers } from "@/data/badges/decodeUtils";

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
}: UseMintBadgeMutationProps) => {
  const { address } = useAccount();
  return useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "mintToMultiple",
    args: args
      ? [args.recipients, args.id, BigInt(1), "0x" as const]
      : undefined,
    successMessage: "Badge minted successfully",
    queryKeysToInvalidateOnSuccess: [
      ["badge", args?.id.toString()],
      ["user"],
      ["communities"],
      ["community"],
      ["communityMembers"],
      ["communityMembersInfinite"],
    ],
    onSuccess: (receipt) => {
      const mints = decodeMintTransfers(receipt);
      capturePostHogEvent("badge_minted", {
        wallet_address: address?.toLowerCase(),
        tx_hash: receipt.transactionHash,
        badge_id: mints[0]?.id.toString(),
        recipient_count: mints.length,
        recipients: mints.map((t) => t.to),
      });
      onSuccess?.(receipt);
    },
    onError,
  });
};
