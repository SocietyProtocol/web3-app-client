"use client";

import {
  Stack,
  Typography,
  TextField,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import { Controller } from "react-hook-form";
import { AvatarInput } from "../AccountSetup/AvatarInput";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useBadgeEdit } from "./BadgeEdit/BadgeEditContext";
import { useAccount } from "wagmi";
import { useHasOfficialBadgeCreatorRole } from "./BadgeCreation/useHasOfficialBadgeCreatorRole";
import { TransactionButton } from "../Transaction/TransactionButton";

interface BadgeDetailsEditProps {
  onCancel: () => void;
  onSave: () => void;
  badgeName: string;
}

export const BadgeDetailsEdit = ({
  onCancel,
  onSave,
  badgeName,
}: BadgeDetailsEditProps) => {
  const { address } = useAccount();
  const hasOfficialBadgeCreatorRole = useHasOfficialBadgeCreatorRole(address);
  const { enqueueSnackbar } = useSnackbar();
  const hasCompletedRef = useRef(false);
  const {
    form,
    refetch,
    onSubmit,
    reset,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionConfirmed,
    isTransactionPending,
    transactionHash,
    getServerFieldError,
  } = useBadgeEdit();

  const {
    register,
    control,
    formState: { errors, isValid },
  } = form;

  // Watch for transaction success
  useEffect(() => {
    if (isTransactionConfirmed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Transaction confirmed, refetch badge data
      refetch().then(() => {
        enqueueSnackbar("Badge updated successfully!", {
          variant: "success",
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
      console.error("Failed to update badge:", error);
      enqueueSnackbar(
        "An unexpected error occurred while updating the badge.",
        {
          variant: "error",
        },
      );
    }
  };

  const isLoading =
    form.formState.isSubmitting ||
    isMutating ||
    isTransactionPending ||
    isTransactionConfirmed;

  return (
    <Stack spacing={{ xs: 3, sm: 4 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={{ xs: 1.5, sm: 0 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Edit Badge: {badgeName}
        </Typography>
      </Stack>

      {/* Form */}
      <Stack spacing={3}>
        <Controller
          name="imageUrl"
          control={control}
          render={({ field }) => (
            <AvatarInput
              label="Badge Image"
              value={field.value}
              onChange={field.onChange}
              error={
                Boolean(errors.imageUrl) ||
                Boolean(getServerFieldError("imageUrl"))
              }
              helperText={
                errors.imageUrl?.message || getServerFieldError("imageUrl")
              }
              disabled={isLoading}
            />
          )}
        />

        <TextField
          label="Badge Name"
          placeholder="Enter badge name"
          fullWidth
          {...register("name")}
          error={Boolean(errors.name) || Boolean(getServerFieldError("name"))}
          helperText={errors.name?.message || getServerFieldError("name")}
          disabled={isLoading}
        />

        <TextField
          label="Metadata (JSON)"
          placeholder='{"description": "Badge description", "attributes": []}'
          fullWidth
          multiline
          rows={6}
          {...register("metadata")}
          error={
            Boolean(errors.metadata) || Boolean(getServerFieldError("metadata"))
          }
          helperText={
            errors.metadata?.message ||
            getServerFieldError("metadata") ||
            "Optional: Additional metadata in JSON format"
          }
          disabled={isLoading}
        />

        {hasOfficialBadgeCreatorRole.data && (
          <Box>
            <Controller
              name="isOfficial"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Official Badge</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Mark this badge as an official badge
                      </Typography>
                    </Box>
                  }
                />
              )}
            />
          </Box>
        )}

        <Box>
          <Controller
            name="isCommunity"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={isLoading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Community Badge</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mark this badge as a community badge
                    </Typography>
                  </Box>
                }
              />
            )}
          />
        </Box>
      </Stack>

      {/* Action Buttons */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="flex-end"
      >
        <Button
          variant="outlined"
          onClick={handleCancelClick}
          disabled={isLoading}
          startIcon={<CancelIcon />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Cancel
        </Button>
        <TransactionButton
          variant="contained"
          onClick={handleSaveClick}
          disabled={!isValid || isLoading || !form.formState.isDirty}
          loading={
            isUploadingToIpfs || isWritingContract || isTransactionPending
          }
          loadingText={
            isUploadingToIpfs
              ? "Uploading to IPFS..."
              : isWritingContract && !transactionHash
                ? "Confirm transaction..."
                : "Saving..."
          }
          startIcon={<SaveIcon />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            minWidth: 140,
          }}
        >
          Update Badge
        </TransactionButton>
      </Stack>
    </Stack>
  );
};
