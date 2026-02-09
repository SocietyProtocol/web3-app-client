import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { useTransaction } from "@/hooks/useTransaction";
import { getBadgesContractAddress } from "@/lib/wagmi";
import { parseErrorMessage } from "@/utils/errors";
import { useSnackbar } from "notistack";
import { useCallback } from "react";
import { Address, Hex } from "viem";
import { useChainId } from "wagmi";

interface UseAcceptInvitationMutationParams {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface AcceptInvitationData {
  inviter: Address;
  message: string;
  signature: Hex;
}

export const useAcceptInvitationMutation = ({
  onSuccess,
  onError,
}: UseAcceptInvitationMutationParams) => {
  const chainId = useChainId();
  const contractAddress = getBadgesContractAddress(chainId);
  const { enqueueSnackbar } = useSnackbar();

  const transaction = useTransaction({
    onSuccess,
    onError: (err) => {
      enqueueSnackbar(
        parseErrorMessage(
          err,
          "Failed to accept invitation, make sure you have a valid referral code from your inviter and try again",
        ),
        {
          variant: "error",
          key: "transaction-error",
        },
      );
      onError?.(err);
    },
    successMessage: "Invitation accepted successfully",
    waitForSync: true,
    suppressErrorSnackbar: true,
  });

  const mutate = useCallback(
    async ({ inviter, message, signature }: AcceptInvitationData) => {
      await transaction.execute({
        address: contractAddress,
        abi: SocietyProtocolBadgesABI,
        functionName: "acceptInvite",
        args: [inviter, message, signature],
      });
    },
    [contractAddress, transaction],
  );

  return {
    mutate,
    ...transaction,
  };
};
