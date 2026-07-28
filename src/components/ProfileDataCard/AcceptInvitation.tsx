import { IconButton, TextField, Stack } from "@mui/material";
import { TransactionButton } from "../Transaction/TransactionButton";
import { DataItem } from "./DataItem";
import { useForm, useWatch } from "react-hook-form";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { referralCodeValidationSchema } from "@/validation/referralCode";
import { useCallback, useEffect, useMemo } from "react";
import { useSnackbar } from "notistack";
import { useAcceptInvitationMutation } from "./useAcceptInvitationMutation";
import { useAccount } from "wagmi";
import { SimulationError } from "@/components/Transaction/SimulationError";
import { isEqualCaseInsensitive } from "@/utils/string";
import { type Hex } from "viem";
import { useHasInvited } from "@/data/users/useHasInvited";

export const AcceptInvitation = () => {
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();

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

  const parsedReferral = useMemo(() => {
    if (!address || !referralCode || typeof referralCode !== "string") {
      return undefined;
    }

    const parsed = referralCodeValidationSchema.safeParse(referralCode);

    if (!parsed.success) {
      return undefined;
    }

    return parsed.data;
  }, [address, referralCode]);

  const hasInvited = useHasInvited(address, parsedReferral?.inviter);

  useEffect(() => {
    if (!referralCode) {
      return;
    }

    void form.trigger("referralCode");
  }, [
    form,
    hasInvited.data,
    hasInvited.error,
    hasInvited.isFetching,
    referralCode,
  ]);

  const validate = useCallback(
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

      if (hasInvited.error) {
        return "Unable to validate referral code. Please check your network connection and try again.";
      }

      if (hasInvited.data) {
        return "You cannot use a referral code from someone you have already invited.";
      }

      return true;
    },
    [address, hasInvited.data, hasInvited.error],
  );

  const invitationArgs = useMemo(() => {
    if (!parsedReferral) {
      return undefined;
    }

    const { inviter, nonce, expiry, signature } = parsedReferral;

    return { inviter, nonce, expiry, signature };
  }, [parsedReferral]);

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
            validate,
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
            transaction.simulation.isError ||
            hasInvited.isFetching
          }
          simulating={transaction.simulation.isFetching}
          loading={transaction.isExecuting || hasInvited.isFetching}
          loadingText={hasInvited.isFetching ? "Loading..." : "Accepting..."}
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
