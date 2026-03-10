"use client";

import { useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import { useAccount } from "wagmi";
import { useBadgeEdit } from "./BadgeEditContext";
import { useHasOfficialBadgeCreatorRole } from "../BadgeCreation/useHasOfficialBadgeCreatorRole";

interface UseBadgeDetailsEditProps {
  onCancel: () => void;
  onSave: () => void;
}

export const useBadgeDetailsEdit = ({
  onCancel,
  onSave,
}: UseBadgeDetailsEditProps) => {
  const { address } = useAccount();
  const hasOfficialBadgeCreatorRole = useHasOfficialBadgeCreatorRole(address);
  const { enqueueSnackbar } = useSnackbar();
  const hasCompletedRef = useRef(false);

  const context = useBadgeEdit();
  const {
    form,
    onSubmit,
    reset,
    isMutating,
    isTransactionConfirmed,
    isTransactionPending,
    badge,
    metadata,
  } = context;

  useEffect(() => {
    if (isTransactionConfirmed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      enqueueSnackbar("Badge updated successfully!", { variant: "success" });
      onSave();
      form.reset();
      reset();
    }
  }, [isTransactionConfirmed, onSave, form, enqueueSnackbar, reset]);

  const isLoading =
    badge?.isLoading ||
    metadata?.isLoading ||
    form.formState.isSubmitting ||
    isMutating ||
    isTransactionPending ||
    isTransactionConfirmed;

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
        { variant: "error" },
      );
    }
  };

  return {
    ...context,
    hasOfficialBadgeCreatorRole,
    isLoading,
    handleCancelClick,
    handleSaveClick,
  };
};
