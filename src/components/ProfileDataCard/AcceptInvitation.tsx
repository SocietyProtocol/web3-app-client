import { IconButton, TextField, Stack } from "@mui/material";
import { TransactionButton } from "../Transaction/TransactionButton";
import { DataItem } from "./DataItem";
import { useForm, useWatch } from "react-hook-form";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { referralCodeValidationSchema } from "@/validation/referralCode";
import { useCallback, useMemo } from "react";
import { useSnackbar } from "notistack";
import { useAcceptInvitationMutation } from "./useAcceptInvitationMutation";
import { useAccount, useConfig } from "wagmi";
import { generateReferralMessage } from "@/utils/referralCode";
import { SimulationError } from "@/components/Transaction/SimulationError";
import { readContract } from "@wagmi/core";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { expectedNetwork } from "@/lib/wagmi";
import { isEqualCaseInsensitive } from "@/utils/string";
import { type Hex } from "viem";

export const AcceptInvitation = () => {
  const wagmiConfig = useConfig();
  const badgesContract = useChainVar(contracts.badges);
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();

  const validateCrossReferral = useCallback(
    async (value: string) => {
      if (!address) {
        return "Wallet address is not available. Please connect your wallet.";
      }

      let inviter: Hex;
      try {
        ({ inviter } = referralCodeValidationSchema.parse(value));
      } catch {
        return "Invalid referral code format.";
      }

      if (isEqualCaseInsensitive(inviter, address)) {
        return "You cannot use your own referral code.";
      }

      try {
        const inviterInviter = await readContract(wagmiConfig, {
          address: badgesContract,
          abi: SocietyProtocolBadgesABI,
          functionName: "invitedBy",
          args: [inviter],
          chainId: expectedNetwork.id,
        });

        if (isEqualCaseInsensitive(inviterInviter, address)) {
          return "You cannot use a referral code from someone you have already invited.";
        }

        return true;
      } catch {
        return "Unable to validate referral code. Please check your network connection and try again.";
      }
    },
    [address, badgesContract, wagmiConfig],
  );

  const form = useForm({
    defaultValues: {
      referralCode: "",
    },
    mode: "onChange",
  });

  const referralCode = useWatch({
    control: form.control,
    name: "referralCode",
  });

  const invitationArgs = useMemo(() => {
    if (
      !address ||
      !referralCode ||
      typeof referralCode !== "string" ||
      !form.formState.isValid
    ) {
      return undefined;
    }

    const parsed = referralCodeValidationSchema.safeParse(referralCode);

    if (!parsed.success) {
      return undefined;
    }

    const { inviter, signature } = parsed.data;
    const message = generateReferralMessage(address);

    return { inviter, signature, message };
  }, [address, referralCode, form.formState.isValid]);

  const transaction = useAcceptInvitationMutation({
    args: invitationArgs,
    onSuccess: () => form.reset(),
  });

  const onPaste = useCallback(async () => {
    if (!navigator?.clipboard?.readText) {
      enqueueSnackbar("Clipboard access is not available in this browser.", {
        variant: "error",
      });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const trimmedText = text.trim();
      form.setValue("referralCode", trimmedText, { shouldValidate: true });
    } catch {
      enqueueSnackbar("Unable to read from clipboard. Please paste manually.", {
        variant: "error",
      });
    }
  }, [enqueueSnackbar, form]);

  const onCancel = useCallback(() => {
    form.resetField("referralCode");
  }, [form]);

  const onSubmit = form.handleSubmit(
    useCallback(async () => {
      if (!address) {
        enqueueSnackbar(
          "Wallet address is not available. Please connect your wallet and try again.",
          {
            variant: "error",
          },
        );
        return;
      }

      await transaction.execute();
    }, [address, enqueueSnackbar, transaction]),
  );

  return (
    <DataItem
      label="Enter Referral Code to Accept Invitation"
      tooltip="If you have received a referral code from an existing user, enter it here to accept the invitation and link your account to the referrer."
    >
      <Stack spacing={2}>
        <TextField
          size="small"
          fullWidth
          placeholder="Paste or enter a referral code"
          {...form.register("referralCode", {
            validate: validateCrossReferral,
          })}
          error={!!form.formState.errors.referralCode}
          helperText={form.formState.errors.referralCode?.message}
          disabled={
            transaction.isExecuting ||
            transaction.isSuccess ||
            form.formState.disabled
          }
          slotProps={{
            input: {
              endAdornment: referralCode ? (
                <IconButton size="small" onClick={onCancel} title="Clear">
                  <CancelIcon
                    fontSize="small"
                    sx={{
                      color: "error.main",
                    }}
                  />
                </IconButton>
              ) : (
                <IconButton size="small" onClick={onPaste} title="Paste">
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              ),
            },
          }}
        />

        <SimulationError error={transaction.simulation.error} />

        <TransactionButton
          variant="outlined"
          sx={{ alignSelf: "flex-start" }}
          size="small"
          disabled={
            !form.formState.isValid ||
            transaction.isSuccess ||
            transaction.simulation.isFetching ||
            transaction.simulation.isError
          }
          simulating={transaction.simulation.isFetching}
          loading={transaction.isExecuting}
          loadingText="Accepting..."
          onClick={onSubmit}
          gas={transaction.gas}
          gasLoading={transaction.gasLoading}
          gasError={transaction.gasError}
        >
          {transaction.isSuccess ? "Invitation Accepted!" : "Accept Invitation"}
        </TransactionButton>
      </Stack>
    </DataItem>
  );
};
