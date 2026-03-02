"use client";

import { Stack, Typography } from "@mui/material";
import { useBadgeDetailsEdit } from "./useBadgeDetailsEdit";
import { BadgeDetailsEditForm } from "./BadgeDetailsEditForm";
import { BadgeDetailsEditActions } from "./BadgeDetailsEditActions";

interface BadgeDetailsEditProps {
  onCancel: () => void;
  onSave: () => void;
}

export const BadgeDetailsEdit = ({
  onCancel,
  onSave,
}: BadgeDetailsEditProps) => {
  const {
    form,
    badge,
    isLoading,
    hasOfficialBadgeCreatorRole,
    getServerFieldError,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    transactionHash,
    handleCancelClick,
    handleSaveClick,
  } = useBadgeDetailsEdit({ onCancel, onSave });

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={{ xs: 1.5, sm: 0 }}
      >
        <Typography variant="h6">
          Edit Badge: {badge?.data?.badge?.name}
        </Typography>
      </Stack>

      <BadgeDetailsEditForm
        form={form}
        isLoading={isLoading}
        hasOfficialBadgeCreatorRole={hasOfficialBadgeCreatorRole}
        getServerFieldError={getServerFieldError}
      />

      <BadgeDetailsEditActions
        isLoading={isLoading}
        isValid={form.formState.isValid}
        isDirty={form.formState.isDirty}
        isUploadingToIpfs={isUploadingToIpfs}
        isWritingContract={isWritingContract}
        isTransactionPending={isTransactionPending}
        transactionHash={transactionHash}
        onCancel={handleCancelClick}
        onSave={handleSaveClick}
      />
    </Stack>
  );
};
