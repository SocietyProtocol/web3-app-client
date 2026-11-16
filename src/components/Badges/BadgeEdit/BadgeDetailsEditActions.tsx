"use client";

import { Stack, Button } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import SaveIcon from "@mui/icons-material/Save";
import { TransactionButton } from "../../Transaction/TransactionButton";
import { WritePayment, walletWaitText } from "@/lib/payment-label";

interface BadgeDetailsEditActionsProps {
  isLoading: boolean;
  isValid: boolean;
  isDirty: boolean;
  isUploadingToIpfs: boolean;
  isWritingContract: boolean;
  isTransactionPending: boolean;
  transactionHash: `0x${string}` | undefined;
  payment: WritePayment;
  onCancel: () => void;
  onSave: () => void;
}

export const BadgeDetailsEditActions = ({
  isLoading,
  isValid,
  isDirty,
  isUploadingToIpfs,
  isWritingContract,
  isTransactionPending,
  transactionHash,
  payment,
  onCancel,
  onSave,
}: BadgeDetailsEditActionsProps) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={2}
    justifyContent="flex-end"
  >
    <Button
      variant="outlined"
      onClick={onCancel}
      disabled={isLoading}
      startIcon={<CancelIcon />}
      sx={{ textTransform: "none", fontWeight: 600 }}
    >
      Cancel
    </Button>
    <TransactionButton
      variant="contained"
      onClick={onSave}
      disabled={!isValid || isLoading || !isDirty}
      loading={isUploadingToIpfs || isWritingContract || isTransactionPending}
      routeKind={payment.routeKind}
      gas={payment.gas}
      gasLoading={payment.gasLoading}
      gasError={payment.gasError}
      loadingText={
        isUploadingToIpfs
          ? "Uploading to IPFS..."
          : isWritingContract && !transactionHash
            ? walletWaitText(payment.routeKind, "Confirm transaction...")
            : "Saving..."
      }
      startIcon={<SaveIcon />}
      sx={{ textTransform: "none", fontWeight: 600, minWidth: 140 }}
    >
      Update Badge
    </TransactionButton>
  </Stack>
);
