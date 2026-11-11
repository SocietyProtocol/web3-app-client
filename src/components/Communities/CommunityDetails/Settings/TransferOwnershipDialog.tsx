"use client";

import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Address, Hex, isAddress } from "viem";
import { ChangeEvent, useState } from "react";
import { z } from "zod";
import { GasEstimation } from "@/components/Transaction/GasEstimation";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { addressValidationSchema } from "@/validation/address";
import { useCommunityDetailsContext } from "../CommunityDetails.context";
import { useTransferOwnership } from "./useTransferOwnership";
import { useLegacyAccounts } from "@/components/shared/useLegacyAccounts";
import {
  MappedRecipient,
  RecipientAddressHints,
} from "@/components/shared/RecipientAddressHints";

const schema = z.object({
  newOwner: addressValidationSchema,
  confirmed: z
    .boolean()
    .refine((val) => val === true, "You must confirm this action"),
});

type FormInputValues = z.input<typeof schema>;
type FormOutputValues = z.output<typeof schema>;

interface TransferOwnershipDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TransferOwnershipDialog({
  open,
  onClose,
}: TransferOwnershipDialogProps) {
  const { id, community } = useCommunityDetailsContext();
  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();
  const legacy = useLegacyAccounts();
  const [mappedOwner, setMappedOwner] = useState<MappedRecipient | undefined>();

  const managerBadgeId = community?.managerBadge?.id;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormInputValues, unknown, FormOutputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      newOwner: "",
      confirmed: false,
    },
    mode: "onChange",
  });

  const watchedNewOwner = useWatch({ control, name: "newOwner" });

  // A migrated wallet becomes its Society address as soon as it is typed.
  const newOwnerField = register("newOwner", {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const resolved = legacy.resolveRecipient(event.target.value);
      if (!resolved.mappedFrom) return;
      setMappedOwner({
        from: resolved.mappedFrom,
        to: resolved.address as Address,
      });
      setValue("newOwner", resolved.address, { shouldValidate: true });
    },
  });
  const validNewOwner =
    watchedNewOwner && isAddress(watchedNewOwner, { strict: false })
      ? (watchedNewOwner.toLowerCase() as Hex)
      : undefined;

  const { transfer, isLoading, gas, gasLoading, gasError } =
    useTransferOwnership({
      communityId: id,
      managerBadgeId,
      newOwner: validNewOwner,
      onSuccess: () => {
        onClose();
      },
    });

  const handleClose = () => {
    reset();
    setMappedOwner(undefined);
    onClose();
  };

  const onSubmit = handleSubmit(async ({ newOwner }) => {
    await transfer(newOwner);
  });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        Transfer Ownership
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning" icon={<ReportProblemOutlinedIcon />}>
              <Typography variant="body2" fontWeight={700}>
                This action is irreversible.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                You will lose manager access to this community immediately after
                the transaction confirms. The recipient will become the new
                community manager.
              </Typography>
            </Alert>

            <TextField
              label="New Owner Address"
              placeholder="0x..."
              fullWidth
              {...newOwnerField}
              error={Boolean(errors.newOwner)}
              helperText={errors.newOwner?.message}
              disabled={isLoading}
            />

            <RecipientAddressHints
              addresses={validNewOwner ? [validNewOwner] : []}
              mapped={mappedOwner ? [mappedOwner] : []}
              onReplace={(_, societyAddress) =>
                setValue("newOwner", societyAddress, { shouldValidate: true })
              }
              disabled={isLoading}
              allowReplace={false}
            />

            <Controller
              name="confirmed"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={field.onChange}
                      color="error"
                      disabled={isLoading}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I understand this action cannot be undone and I want to
                      transfer ownership of this community.
                    </Typography>
                  }
                />
              )}
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
            color="error"
            loading={isLoading}
            loadingText="Transferring..."
            disabled={
              !isValid || isLoading || !managerBadgeId || isWrongNetwork
            }
          >
            {isWrongNetwork
              ? `Switch to ${expectedNetwork.name}`
              : "Transfer Ownership"}
          </TransactionButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
