import {
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataItem } from "./DataItem";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addressValidationSchema } from "@/validation/address";
import { useCallback, useState } from "react";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { useSignMessage } from "wagmi";
import { CopyButton } from "../CopyButton/CopyButton";
import { Hex } from "viem";
import { useSnackbar } from "notistack";
import { parseErrorMessage } from "@/utils/errors";

export function generateReferralMessage(address: string): string {
  return `Sign this message to generate a referral code for the address: ${address}`;
}

export const ReferralCodeGenerator = () => {
  const [referralCode, setReferralCode] = useState<Hex | null>(null);
  const { signMessageAsync } = useSignMessage();
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        address: addressValidationSchema,
      })
    ),
    defaultValues: {
      address: "",
    },
    mode: "onChange",
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
      form.setValue("address", text);
      form.trigger("address");
    } catch {
      enqueueSnackbar("Unable to read from clipboard. Please paste manually.", {
        variant: "error",
      });
    }
  }, [enqueueSnackbar, form]);

  const onCancel = useCallback(() => {
    form.resetField("address");
    setReferralCode(null);
  }, [form]);

  const onSubmit = form.handleSubmit(
    useCallback(
      async (data) => {
        try {
          const message = generateReferralMessage(data.address);

          const signature = await signMessageAsync({ message });

          setReferralCode(signature);
        } catch (error) {
          enqueueSnackbar(
            parseErrorMessage(
              error,
              "An unexpected error occurred while generating the referral code."
            ),
            { variant: "error" }
          );
        }
      },
      [signMessageAsync, enqueueSnackbar]
    )
  );

  return (
    <DataItem
      label="Generate a Referral Code"
      tooltip="Referral codes will be used to invite new users to the platform"
    >
      <Controller
        name="address"
        control={form.control}
        render={({ field, fieldState }) => (
          <TextField
            size="small"
            fullWidth
            placeholder={"Paste or enter an address"}
            {...field}
            error={fieldState.invalid}
            helperText={fieldState.error?.message}
            slotProps={{
              input: {
                endAdornment: field.value ? (
                  <IconButton size="small" onClick={onCancel} title="Clear">
                    <CancelIcon
                      fontSize="small"
                      sx={{
                        color: "error.light",
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

      {referralCode ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography component="div" color="text.label">
            Share this Referral Code:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Typography
              component="div"
              variant="body2"
              sx={{ wordBreak: "break-all", color: "success.contrastText" }}
            >
              {referralCode}
            </Typography>
            <CopyButton textToCopy={referralCode} size="medium" />
          </Stack>
        </Stack>
      ) : (
        <Button
          variant="outlined"
          sx={{ alignSelf: "flex-start" }}
          size="small"
          disabled={!form.formState.isValid}
          onClick={onSubmit}
        >
          Generate
        </Button>
      )}
    </DataItem>
  );
};
