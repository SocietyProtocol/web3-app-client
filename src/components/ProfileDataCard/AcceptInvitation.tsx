import { IconButton, TextField } from "@mui/material";
import { TransactionButton } from "../Transaction/TransactionButton";
import { DataItem } from "./DataItem";
import { Controller, useForm, useWatch } from "react-hook-form";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { zodResolver } from "@hookform/resolvers/zod";
import { referralCodeValidationSchema } from "@/validation/referralCode";
import z from "zod";
import { useCallback, useMemo } from "react";
import { useSnackbar } from "notistack";
import { useAcceptInvitationMutation } from "./useAcceptInvitationMutation";
import { useAccount } from "wagmi";
import { generateReferralMessage } from "@/utils/referralCode";
import { SimulationError } from "@/components/Transaction/SimulationError";
import { Stack } from "@mui/material";

export const AcceptInvitation = () => {
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        referralCode: referralCodeValidationSchema,
      }),
    ),
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
      typeof referralCode === "string" ||
      !form.formState.isValid
    )
      return undefined;

    const { inviter, signature } = referralCode;
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
        <Controller
          name="referralCode"
          control={form.control}
          render={({ field, fieldState }) => (
            <TextField
              size="small"
              fullWidth
              placeholder={"Paste or enter a referral code"}
              {...field}
              error={fieldState.invalid}
              helperText={fieldState.error?.message}
              disabled={
                transaction.isExecuting ||
                transaction.isSuccess ||
                field.disabled
              }
              slotProps={{
                input: {
                  endAdornment: field.value ? (
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
          )}
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
