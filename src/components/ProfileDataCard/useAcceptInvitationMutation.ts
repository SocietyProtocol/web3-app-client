import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useTransaction } from "@/hooks/useTransaction";
import { Address, Hex } from "viem";
import { useReferredBy } from "./useReferredBy";

interface AcceptInvitationData {
  inviter: Address;
  message: string;
  signature: Hex;
}

interface UseAcceptInvitationMutationParams {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  args?: AcceptInvitationData;
}

export const useAcceptInvitationMutation = ({
  onSuccess,
  onError,
  args,
}: UseAcceptInvitationMutationParams) =>
  useTransaction({
    address: useChainVar(contracts.badges),
    abi: SocietyProtocolBadgesABI,
    functionName: "acceptInvite",
    args: args ? [args.inviter, args.message, args.signature] : undefined,
    successMessage: "Invitation accepted successfully",
    errorMessage: "Failed to accept invitation",
    queryKeysToInvalidateOnSuccess: [useReferredBy(args?.inviter).queryKey],
    onSuccess,
    onError,
  });
