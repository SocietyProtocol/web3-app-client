"use client";

import { useState, useMemo } from "react";
import { useSnackbar } from "notistack";
import { Wizard, WizardStep } from "../../Wizard";
import { BadgeInfoStep } from "./BadgeInfoStep";
import { BadgePermissionsStep } from "./BadgePermissionsStep";
import {
  BadgeCreationProvider,
  useBadgeCreation,
} from "./BadgeCreationContext";
import { useAccount } from "wagmi";
import { Box, Stack } from "@mui/material";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { ValidationError } from "@/errors/ValidationError";
import { parseErrorMessage } from "@/utils/errors";
import { BadgePreview } from "./BadgePreview";

const steps: WizardStep[] = [
  { label: "Badge Info", description: "Basic badge information" },
  { label: "Permissions", description: "Set permissions and managers" },
];

const BadgeCreationWizardContent = () => {
  const [activeStep, setActiveStep] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const {
    form,
    onSubmit,
    isMutating,
    isTransactionPending,
    isSyncing,
    isUploadingToIpfs,
    isWritingContract,
  } = useBadgeCreation();

  const { address } = useAccount();
  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();

  const nextDisabled = !form.formState.isValid;

  const handleNext = async () => {
    // Validate current step before moving forward
    if (activeStep === 0) {
      const isValid = await form.trigger(["name", "imageUrl", "metadata"]);

      if (!isValid) {
        enqueueSnackbar("Please fix the validation errors before proceeding.", {
          variant: "error",
        });
        return;
      }
    }

    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFinish = async () => {
    if (!address) {
      enqueueSnackbar("No wallet connected", { variant: "error" });
      return;
    }

    if (isWrongNetwork) {
      enqueueSnackbar(`Please switch to ${expectedNetwork.name} network.`, {
        variant: "error",
      });
      return;
    }

    try {
      await onSubmit();
      // Success message will be shown after transaction confirmation
    } catch (err) {
      console.error("Error creating badge:", err);

      if (err instanceof ValidationError) {
        const hasInfoError =
          err.details?.name || err.details?.imageUrl || err.details?.metadata;

        const hasPermissionsError =
          err.details?.minters ||
          err.details?.transferers ||
          err.details?.burners ||
          err.details?.editors;

        if (hasInfoError) {
          setActiveStep(0);
        } else if (hasPermissionsError) {
          setActiveStep(1);
        }

        enqueueSnackbar("Validation error occurred. Please check your input.", {
          variant: "error",
        });
      } else {
        enqueueSnackbar(
          parseErrorMessage(
            err,
            "An unexpected error occurred while creating the badge.",
          ),
          { variant: "error" },
        );
      }
    }
  };

  // Determine loading text based on state
  const loadingText = useMemo(() => {
    if (isUploadingToIpfs) return "Uploading metadata to IPFS...";
    if (isTransactionPending) return "Waiting for transaction confirmation...";
    if (isSyncing) return "Waiting for subgraph to sync...";
    if (isWritingContract) return "Waiting for wallet confirmation...";
    return "Saving...";
  }, [isUploadingToIpfs, isTransactionPending, isSyncing, isWritingContract]);

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={4}
      sx={{ width: "100%" }}
    >
      <Box sx={{ flex: { xs: 1, md: 2 } }}>
        <Wizard
          title="Create New Badge"
          steps={steps}
          activeStep={activeStep}
          onNext={handleNext}
          onBack={handleBack}
          onFinish={handleFinish}
          nextDisabled={nextDisabled}
          backDisabled={activeStep === 0}
          finishDisabled={!form.formState.isValid}
          isLoading={isMutating || isSyncing}
          loadingText={loadingText}
          minHeight={{ xs: 400, sm: 500, md: 600 }}
        >
          {activeStep === 0 && <BadgeInfoStep />}
          {activeStep === 1 && <BadgePermissionsStep />}
        </Wizard>
      </Box>

      <Box
        sx={{
          flex: { xs: 0, md: 1 },
          display: { xs: "none", md: "block" },
          maxWidth: 300,
        }}
      >
        <BadgePreview />
      </Box>
    </Stack>
  );
};

export const BadgeCreationWizard = () => {
  return (
    <BadgeCreationProvider>
      <BadgeCreationWizardContent />
    </BadgeCreationProvider>
  );
};
