"use client";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GasEstimation } from "@/components/Transaction/GasEstimation";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { AvatarInput } from "@/components/AccountSetup/AvatarInput";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { useBadge } from "@/data/badges/useBadge";
import { imageUrlSchema } from "@/validation/imageUrl";
import { useCommunityDetailsContext } from "../CommunityDetails.context";
import { useUpdateManagerBadge } from "./useUpdateManagerBadge";

const schema = z.object({
  name: z
    .string()
    .min(1, "Badge name is required")
    .max(100, "Badge name must be at most 100 characters"),
  imageUrl: imageUrlSchema,
  metadata: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Metadata must be valid JSON" },
    )
    .optional()
    .default(""),
});

type FormValues = z.input<typeof schema>;

interface EditManagerBadgeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EditManagerBadgeDialog({
  open,
  onClose,
}: EditManagerBadgeDialogProps) {
  const { id, community } = useCommunityDetailsContext();
  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();

  const managerBadgeId = community?.managerBadge?.id;
  const { data: badgeData, isLoading: isBadgeLoading } = useBadge(
    open ? managerBadgeId : undefined,
  );
  const badge = badgeData?.badge;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: badge?.name ?? "",
      imageUrl: badge?.imageUrl ?? null,
      metadata: "",
    },
    mode: "onChange",
  });

  const watchedName = useWatch({ control, name: "name" });

  const { update, isLoading, isUploadingToIpfs, gas, gasLoading, gasError } =
    useUpdateManagerBadge({
      communityId: id,
      badgeId: managerBadgeId,
      badgeName: watchedName || undefined,
      onSuccess: () => {
        onClose();
      },
    });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async ({ name, imageUrl, metadata }) => {
    if (!managerBadgeId) return;
    await update(managerBadgeId, name, imageUrl ?? null, metadata ?? "");
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        Edit Manager Badge
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={onSubmit}>
        <DialogContent>
          {isBadgeLoading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Controller
                name="imageUrl"
                control={control}
                render={({ field }) => (
                  <AvatarInput
                    label="Badge Image"
                    value={field.value}
                    onChange={field.onChange}
                    error={Boolean(errors.imageUrl)}
                    helperText={errors.imageUrl?.message as string | undefined}
                    disabled={isLoading}
                  />
                )}
              />

              <TextField
                label="Badge Name"
                fullWidth
                {...register("name")}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
                disabled={isLoading}
              />

              <TextField
                label="Metadata (JSON)"
                placeholder='{"description": "Badge description", "attributes": []}'
                fullWidth
                multiline
                rows={4}
                {...register("metadata")}
                error={Boolean(errors.metadata)}
                helperText={
                  errors.metadata?.message ??
                  "Optional: Additional metadata in JSON format"
                }
                disabled={isLoading}
              />
            </Stack>
          )}
          {(gas !== undefined || gasLoading) && (
            <GasEstimation
              value={gas}
              isLoading={gasLoading}
              isError={gasError}
              sx={{ mt: 1.5 }}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <TransactionButton
            type="submit"
            variant="contained"
            loading={isLoading}
            loadingText={isUploadingToIpfs ? "Uploading..." : "Saving..."}
            disabled={
              !isValid ||
              !isDirty ||
              isLoading ||
              isBadgeLoading ||
              !managerBadgeId ||
              isWrongNetwork
            }
          >
            {isWrongNetwork
              ? `Switch to ${expectedNetwork.name}`
              : "Save Changes"}
          </TransactionButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
