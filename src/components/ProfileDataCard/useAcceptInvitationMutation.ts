import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useTransaction } from "@/hooks/useTransaction";
import { Address, Hex } from "viem";
import { useReferredBy } from "./useReferredBy";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
}: UseAcceptInvitationMutationParams) => {
  const contractAddress = useChainVar(contracts.badges);
  const queryClient = useQueryClient();

  const referredBy = useReferredBy(args?.inviter);

  const handleSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: referredBy.queryKey });
    onSuccess?.();
  }, [queryClient, referredBy.queryKey, onSuccess]);

  return useTransaction({
    address: contractAddress,
    abi: SocietyProtocolBadgesABI,
    functionName: "acceptInvite",
    args: args ? [args.inviter, args.message, args.signature] : undefined,
    successMessage: "Invitation accepted successfully",
    errorMessage: "Failed to accept invitation",
    onSuccess: handleSuccess,
    onError,
    waitForSync: true,
  });
};
