import { Stack, Typography, Button, TextField } from "@mui/material";
import { useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import { Controller } from "react-hook-form";
import { AvatarInput } from "./AvatarInput";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useAccountSetup } from "./AccountSetupContext";
import { parseErrorMessage } from "@/utils/errors";
import { useAccount } from "wagmi";
import { truncateAddress } from "@/utils/string";

interface AccountDetailsEditProps {
  onCancel: () => void;
  onSave: () => void;
}

export const AccountDetailsEdit = ({
  onCancel,
  onSave,
}: AccountDetailsEditProps) => {
  const { address } = useAccount();
  const { enqueueSnackbar } = useSnackbar();
  const hasCompletedRef = useRef(false);
  const {
    form,
    refetch,
    isLoading,
    onSubmit,
    reset,
    isMutatingProfile,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionConfirmed,
    isTransactionPending,
    getServerFieldError,
  } = useAccountSetup();

  // Watch for transaction confirmation
  useEffect(() => {
    if (isTransactionConfirmed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Transaction confirmed, refetch profile data
      refetch().then(() => {
        enqueueSnackbar("Profile updated successfully!", {
          variant: "success",
          key: "account-update-success",
        });
        onSave();
        form.reset();
        reset();
      });
    }
  }, [isTransactionConfirmed, refetch, onSave, form, enqueueSnackbar, reset]);

  const handleCancelClick = () => {
    form.reset();
    onCancel();
  };

  const handleSaveClick = async () => {
    try {
      await onSubmit();
    } catch (error) {
      console.error("Failed to update profile:", error);

      enqueueSnackbar(
        parseErrorMessage(
          error,
          "An unexpected error occurred while creating/updating profile.",
        ),
        { variant: "error" },
      );
    }
  };

  const disabled =
    isLoading ||
    form.formState.isSubmitting ||
    isMutatingProfile ||
    isTransactionPending ||
    isTransactionConfirmed;

  // Determine button text based on state
  const getButtonText = () => {
    if (isUploadingToIpfs) {
      return "Uploading to IPFS...";
    }
    if (isWritingContract) {
      return "Confirm transaction...";
    }
    if (isTransactionPending) {
      return "Confirming...";
    }
    return "Save";
  };

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {/* Header with Edit Button */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={{ xs: 1.5, sm: 0 }}
      >
        {/* Account Details Header */}
        <Typography variant="h6">
          Account details {address && truncateAddress(address)}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSaveClick}
            variant="contained"
            size="small"
            disabled={disabled || !form.formState.isDirty}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {getButtonText()}
          </Button>
          <Button
            startIcon={<CancelIcon />}
            onClick={handleCancelClick}
            variant="outlined"
            size="small"
            disabled={disabled}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>

      {/* Avatar and Name Section */}

      <Controller
        name="imageUrl"
        control={form.control}
        render={({ field, fieldState }) => {
          const serverError = getServerFieldError("imageUrl");
          const error = fieldState.error?.message || serverError;
          const onChange = (value: string | null) => {
            field.onChange(value);
            reset();
          };

          return (
            <AvatarInput
              value={field.value ?? null}
              onChange={onChange}
              disabled={disabled}
              error={Boolean(error)}
              helperText={error}
            />
          );
        }}
      />

      {/* Name Section */}
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => {
          const serverError = getServerFieldError("name");
          const error = fieldState.error?.message || serverError;
          const onChange = (value: string) => {
            field.onChange(value);
            reset();
          };

          return (
            <TextField
              label="Name"
              fullWidth
              disabled={disabled}
              {...field}
              onChange={(e) => onChange(e.target.value)}
              error={Boolean(error)}
              helperText={
                error || `${(form.watch("name") || "").length}/100 characters`
              }
            />
          );
        }}
      />

      {/* Bio Section */}
      <Controller
        name="bio"
        control={form.control}
        render={({ field, fieldState }) => {
          const serverError = getServerFieldError("bio");
          const error = fieldState.error?.message || serverError;
          const onChange = (value: string) => {
            field.onChange(value);
            reset();
          };
          return (
            <TextField
              label="Bio"
              fullWidth
              multiline
              rows={4}
              disabled={disabled}
              {...field}
              onChange={(e) => onChange(e.target.value)}
              error={Boolean(error)}
              helperText={
                error || `${(form.watch("bio") || "").length}/500 characters`
              }
            />
          );
        }}
      />
    </Stack>
  );
};
