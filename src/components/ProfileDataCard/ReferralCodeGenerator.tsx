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
import {
  useController,
  useForm,
  useFormState,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addressValidationSchema } from "@/validation/address";
import { useCallback, useMemo } from "react";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { useAccount } from "wagmi";
import { CopyButton } from "../CopyButton/CopyButton";
import { Hex } from "viem";
import { useSnackbar } from "notistack";
import { parseErrorMessage } from "@/utils/errors";
import { isEqualCaseInsensitive } from "@/utils/string";
import { parseReferralCode } from "@/utils/referralCode";
import { useGenerateReferralCode } from "./useGenerateReferralCode";
import { formatDateInSeconds } from "@/utils/date";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useTemporaryState } from "@/hooks/useTemporaryState";

// Set the minimum validity to 3 minutes to ensure the user has enough time to copy and share the code, even if they encounter some issues during the process. This is especially important considering potential delays in signing the message or copying the code on mobile devices.
const REFERRAL_CODE_MIN_VALIDITY_MS = 180_000;

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
  const [generatedCode, setGeneratedCode] = useTemporaryState<{
    address: Hex;
    code: Hex;
  } | null>(null);

  const { address: account } = useAccount();
  const currentUser = useUserQuery(account);
  const { enqueueSnackbar } = useSnackbar();
  const { generate, isSigning, isReady } = useGenerateReferralCode(account);

  const form = useForm({
    resolver: zodResolver(
      z.object({
        address: addressValidationSchema
          .refine(
            (value) =>
              account ? !isEqualCaseInsensitive(value as Hex, account) : true,
            "You cannot generate a referral code for your own address",
          )
          .refine(
            (value) =>
              currentUser.data?.invitedBy
                ? !isEqualCaseInsensitive(
                    value as Hex,
                    currentUser.data.invitedBy.id as Hex,
                  )
                : true,
            "You cannot generate a referral code for the address that referred you",
          )
          .optional(),
      }),
    ),
    defaultValues: {
      address: undefined,
    },
    mode: "onChange",
  });

  const { address } = useWatch({
    control: form.control,
  });

  const { field: addressField, fieldState: addressFieldState } = useController({
    name: "address",
    control: form.control,
  });

  const { isValid } = useFormState({ control: form.control });

  const targetUser = useUserQuery(address as Hex | undefined);

  const existingReferrer = targetUser.data?.invitedBy;

  const alreadyReferred = !!existingReferrer;

  // Show the generated code only if it was generated for the current address
  const referralCode = useMemo(() => {
    return generatedCode &&
      address &&
      isEqualCaseInsensitive(generatedCode.address, address as Hex)
      ? generatedCode.code
      : null;
  }, [generatedCode, address]);

  const expiryFormatted = useMemo(() => {
    if (!referralCode) return null;

    try {
      const parsed = parseReferralCode(referralCode);
      return formatDateInSeconds(parsed.expiry);
    } catch {
      return null;
    }
  }, [referralCode]);

  const onPaste = useCallback(async () => {
    if (!navigator?.clipboard?.readText) {
      enqueueSnackbar("Clipboard access is not available in this browser.", {
        variant: "error",
      });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      form.setValue("address", text.trim(), {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
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
        if (!account || data.address === undefined) {
          return;
        }

        try {
          setGeneratedCode(
            await generate(data.address as Hex),
            REFERRAL_CODE_MIN_VALIDITY_MS,
          );
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
      [account, setGeneratedCode, generate, enqueueSnackbar],
    ),
  );

  return (
    <DataItem
      label="Generate a Referral Code"
      tooltip="Referral codes will be used to invite new users to the platform"
      loading={currentUser.isLoading}
    >
      <AddressInput
        {...addressField}
        value={addressField.value ?? ""}
        loading={currentUser.isLoading || targetUser.isLoading}
        onCancel={onCancel}
        onPaste={onPaste}
        error={Boolean(addressFieldState.error) || alreadyReferred}
        helperText={
          addressFieldState.error
            ? addressFieldState.error.message
            : alreadyReferred
              ? `This address was already referred by ${
                  account &&
                  alreadyReferred &&
                  existingReferrer &&
                  isEqualCaseInsensitive(existingReferrer.id, account)
                    ? "you"
                    : existingReferrer?.id
                }`
              : ""
        }
        autoComplete="off"
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
          <Typography variant="caption" color="text.secondary">
            Expires {expiryFormatted}
          </Typography>
        </Stack>
      ) : (
        <Button
          variant="outlined"
          sx={{ alignSelf: "flex-start" }}
          size="small"
          disabled={
            !account ||
            !address ||
            !isValid ||
            !isReady ||
            alreadyReferred ||
            currentUser.isLoading ||
            targetUser.isLoading ||
            isSigning
          }
          startIcon={isSigning ? <CircularProgress size={14} /> : undefined}
          onClick={onSubmit}
        >
          {isSigning ? "Signing..." : "Generate"}
        </Button>
      )}
    </DataItem>
  );
};
