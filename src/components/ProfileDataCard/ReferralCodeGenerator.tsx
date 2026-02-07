import {
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
} from "@mui/material";
import { DataItem } from "./DataItem";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addressValidationSchema } from "@/validation/address";
import { useCallback, useMemo, useState } from "react";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { useAccount, useSignMessage } from "wagmi";
import { CopyButton } from "../CopyButton/CopyButton";
import { Hex, isAddress, zeroAddress } from "viem";
import { useSnackbar } from "notistack";
import { parseErrorMessage } from "@/utils/errors";
import { generateReferralCode, generateReferralMessage } from "./utils";
import { isEqualCaseInsensitive } from "@/utils/string";
import { useInvitedBy } from "./useInvitedBy";

interface AddressInputProps extends Omit<TextFieldProps, "variant"> {
  loading?: boolean;
  onCancel: () => void;
  onPaste: () => void;
}

const AddressInput = ({
  loading,
  onCancel,
  onPaste,
  ...props
}: AddressInputProps) => {
  return (
    <TextField
      {...props}
      size="small"
      fullWidth
      placeholder="Paste or enter an address"
      slotProps={{
        input: {
          endAdornment: loading ? (
            <CircularProgress size={16} />
          ) : props.value ? (
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
  );
};

export const ReferralCodeGenerator = () => {
  const [referralCodeMap, setReferralCodeMap] = useState<
    Record<Hex, Record<Hex, Hex | null>>
  >({});

  const { address: account } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        address: z.union([
          addressValidationSchema.refine(
            (value) =>
              account ? !isEqualCaseInsensitive(value as Hex, account) : true,
            {
              message:
                "You cannot generate a referral code for your own address",
            },
          ),
          z.literal(""),
        ]),
      }),
    ),
    defaultValues: {
      address: "",
    },
    mode: "onChange",
  });

  const { address } = useWatch({
    control: form.control,
  });

  const invitedBy = useInvitedBy(
    useMemo(
      () =>
        address &&
        account &&
        isAddress(address, { strict: false }) &&
        !isEqualCaseInsensitive(address, account as Hex)
          ? address
          : undefined,
      [account, address],
    ),
  );

  const alreadyReferred =
    invitedBy.data !== undefined && invitedBy.data !== zeroAddress;

  const referralCode = useMemo(() => {
    if (!account) return null;

    return referralCodeMap[account]?.[address?.toLowerCase() as Hex] || null;
  }, [account, referralCodeMap, address]);

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
  }, [form]);

  const onSubmit = form.handleSubmit(
    useCallback(
      async (data) => {
        if (!account || !data.address) {
          return;
        }

        try {
          const message = generateReferralMessage(data.address);

          const signature = await signMessageAsync({ message });

          const referralCode = generateReferralCode(signature, account);

          setReferralCodeMap((prev) => ({
            ...prev,
            [account]: {
              ...prev[account],
              [data.address.toLowerCase()]: referralCode,
            },
          }));
        } catch (error) {
          enqueueSnackbar(
            parseErrorMessage(
              error,
              "An unexpected error occurred while generating the referral code.",
            ),
            { variant: "error" },
          );
        }
      },
      [signMessageAsync, account, enqueueSnackbar],
    ),
  );

  return (
    <DataItem
      label="Generate a Referral Code"
      tooltip="Referral codes will be used to invite new users to the platform"
    >
      <Controller
        name="address"
        control={form.control}
        render={({ field, fieldState }) => {
          const error = Boolean(fieldState.error) || alreadyReferred;

          const referrer =
            account &&
            alreadyReferred &&
            isEqualCaseInsensitive(invitedBy.data, account)
              ? "you"
              : invitedBy.data;

          const helperText = fieldState.error
            ? fieldState.error.message
            : alreadyReferred
              ? `This address was already referred by ${referrer}`
              : "";

          return (
            <AddressInput
              {...field}
              loading={invitedBy.isLoading}
              onCancel={onCancel}
              onPaste={onPaste}
              error={error}
              helperText={helperText}
            />
          );
        }}
      />

      {referralCode ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography component="div" color="text.primary">
            Share this Referral Code:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Typography
              component="div"
              variant="body2"
              sx={{ wordBreak: "break-all", color: "success.light" }}
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
          disabled={
            !address ||
            !form.formState.isValid ||
            alreadyReferred ||
            invitedBy.isLoading
          }
          onClick={onSubmit}
        >
          Generate
        </Button>
      )}
    </DataItem>
  );
};
