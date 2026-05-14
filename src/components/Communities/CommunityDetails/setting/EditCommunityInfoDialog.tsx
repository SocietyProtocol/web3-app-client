"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GasEstimation } from "@/components/Transaction/GasEstimation";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { useCommunityDetailsContext } from "../CommunityDetails.context";
import { useUpdateCommunityInfo } from "./useUpdateCommunityInfo";

const schema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be at most 500 characters"),
});

type FormValues = z.infer<typeof schema>;

interface EditCommunityInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EditCommunityInfoDialog({
  open,
  onClose,
}: EditCommunityInfoDialogProps) {
  const { id, community } = useCommunityDetailsContext();
  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: community?.name ?? "",
      description: community?.description ?? "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      reset({
        name: community?.name ?? "",
        description: community?.description ?? "",
      });
    }
  }, [open, community, reset]);

  const [name, description] = useWatch({
    control,
    name: ["name", "description"],
  });

  const { update, isLoading, gas, gasLoading, gasError } =
    useUpdateCommunityInfo({
      communityId: id,
      name,
      description,
      enabled: open,
      onSuccess: () => {
        onClose();
      },
    });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async ({ name, description }) => {
    await update(name, description);
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        Edit Community Info
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Community Name"
              fullWidth
              {...register("name")}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              disabled={isLoading}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              {...register("description")}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              disabled={isLoading}
            />
          </Stack>
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
            loadingText="Saving..."
            disabled={!isValid || !isDirty || isWrongNetwork}
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
