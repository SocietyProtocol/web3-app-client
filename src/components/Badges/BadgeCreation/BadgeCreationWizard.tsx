"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSnackbar } from "notistack";
import { useRouter } from "next/navigation";
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
import { useWaitForSubgraphSync } from "@/hooks/useWaitForSubgraphSync";
import { ValidationError } from "@/errors/ValidationError";
import { parseErrorMessage } from "@/utils/errors";
import { BadgePreview } from "./BadgePreview";
import { decodeBadgeId } from "@/data/badges/utils";

const steps: WizardStep[] = [
  { label: "Badge Info", description: "Basic badge information" },
  { label: "Permissions", description: "Set permissions and managers" },
];

const BadgeCreationWizardContent = ({
  onComplete,
}: {
  onComplete?: () => void;
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const hasCompletedRef = useRef(false);
  const {
    form,
    onSubmit,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    transactionReceipt,
    reset,
  } = useBadgeCreation();

  const { address } = useAccount();
  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();

  // Derive target block from transaction receipt
  const targetBlock = useMemo(
    () =>
      isTransactionConfirmed && transactionReceipt
        ? transactionReceipt.blockNumber
        : undefined,
    [isTransactionConfirmed, transactionReceipt],
  );

  const { isSynced, isWaiting: isWaitingForSync } =
    useWaitForSubgraphSync(targetBlock);

  // Watch for transaction confirmation and set target block
  useEffect(() => {
    if (
      isTransactionConfirmed &&
      !hasCompletedRef.current &&
      transactionReceipt
    ) {
      enqueueSnackbar("Badge created successfully!", {
        variant: "success",
        key: "badge-creation-success",
      });
    }
  }, [isTransactionConfirmed, transactionReceipt, enqueueSnackbar]);

  // Watch for subgraph sync and redirect
  useEffect(() => {
    if (isSynced && !hasCompletedRef.current && transactionReceipt) {
      hasCompletedRef.current = true;
      form.reset();
      reset();

      if (onComplete) {
        onComplete();
      } else {
        const createdBadgeId = decodeBadgeId(transactionReceipt);

        if (createdBadgeId) {
          // Redirect to the newly created badge details page
          router.push(`/badges/${createdBadgeId.toString()}`);
          return;
        }

        // Redirect to badges page
        router.push("/badges");
      }
    }
  }, [isSynced, onComplete, form, reset, router, transactionReceipt]);

  const nextDisabled =
    !form.formState.isValid &&
    (Boolean(
      activeStep === 0 &&
      (form.formState.errors.name ||
        form.formState.errors.imageUrl ||
        form.formState.errors.metadata),
    ) ||
      Boolean(
        activeStep === 1 &&
        (form.formState.errors.minters ||
          form.formState.errors.transferers ||
          form.formState.errors.burners ||
          form.formState.errors.editors),
      ));

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

        if (hasInfoError) {
          setActiveStep(0);
        }

        const hasPermissionsError =
          err.details?.minters ||
          err.details?.transferers ||
          err.details?.burners ||
          err.details?.editors;

        if (hasPermissionsError) {
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
    if (isWritingContract) return "Waiting for wallet confirmation...";
    if (isTransactionPending) return "Creating badge...";
    if (isWaitingForSync) return "Waiting for blockchain sync...";
    return "Processing...";
  }, [
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isWaitingForSync,
  ]);

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={4}
      sx={{ width: "100%" }}
    >
      <Box sx={{ flex: { xs: 1, md: 2 } }}>
        <Wizard
          title="Create Badge"
          steps={steps}
          activeStep={activeStep}
          onNext={handleNext}
          onBack={handleBack}
          onFinish={handleFinish}
          nextDisabled={nextDisabled}
          backDisabled={activeStep === 0}
          finishDisabled={!form.formState.isValid}
          isLoading={isMutating || isWaitingForSync}
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

export const BadgeCreationWizard = ({
  onComplete,
}: {
  onComplete?: () => void;
}) => {
  return (
    <BadgeCreationProvider>
      <BadgeCreationWizardContent onComplete={onComplete} />
    </BadgeCreationProvider>
  );
};
