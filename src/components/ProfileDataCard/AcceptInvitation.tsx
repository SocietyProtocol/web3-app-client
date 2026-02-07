import { Button, IconButton, TextField } from "@mui/material";
import { DataItem } from "./DataItem";
import { Controller, useForm } from "react-hook-form";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { zodResolver } from "@hookform/resolvers/zod";
import { referralCodeValidationSchema } from "@/validation/referralCode";
import z from "zod";
import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useAcceptInvitationMutation } from "./useAcceptInvitationMutation";
import { generateReferralMessage } from "./utils";
import { useAccount } from "wagmi";
import { useInvitedBy } from "./useInvitedBy";

export const AcceptInvitation = () => {
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();

  const invitedBy = useInvitedBy(address);

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

  const { mutate, isExecuting, isSuccess } = useAcceptInvitationMutation({
    onSuccess: () => {
      form.reset();
      invitedBy.refetch();
    },
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
      form.setValue("referralCode", text);
      form.trigger("referralCode");
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
    useCallback(
      async (data) => {
        if (!address) {
          enqueueSnackbar(
            "Wallet address is not available. Please connect your wallet and try again.",
            {
              variant: "error",
            },
          );
          return;
        }

        const { inviter, signature } = data.referralCode;
        const message = generateReferralMessage(address);

        mutate({ inviter, signature, message });
      },
      [address, enqueueSnackbar, mutate],
    ),
  );

  return (
    <DataItem
      label="Enter Referral Code to Accept Invitation"
      tooltip="If you have received a referral code from an existing user, enter it here to accept the invitation and link your account to the referrer."
    >
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
            disabled={isExecuting || isSuccess || field.disabled}
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

      <Button
        variant="outlined"
        sx={{ alignSelf: "flex-start" }}
        size="small"
        disabled={!form.formState.isValid || isExecuting || isSuccess}
        onClick={onSubmit}
      >
        Accept Invitation
      </Button>
    </DataItem>
  );
};
