import { useState, useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import { Wizard, WizardStep } from "../Wizard";
import { AccountInfoStep } from "./AccountInfoStep";
import { ReviewStep } from "./ReviewStep";
import { AccountSetupProvider, useAccountSetup } from "./AccountSetupContext";
import { useAccount } from "wagmi";
import { Box } from "@mui/material";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { ValidationError } from "@/errors/ValidationError";
import { parseErrorMessage } from "@/utils/errors";

const steps: WizardStep[] = [
  { label: "Account Info", description: "Set up your profile" },
  { label: "Review", description: "Review your information" },
];

const AccountSetupWizardContent = ({
  onComplete,
}: {
  onComplete?: () => void;
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const hasCompletedRef = useRef(false);
  const {
    form,
    onSubmit,
    isMutatingProfile,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    refetch,
    reset,
  } = useAccountSetup();

  const { address } = useAccount();

  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();

  // Watch for transaction confirmation and refetch profile
  useEffect(() => {
    if (isTransactionConfirmed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Transaction confirmed, refetch profile data
      refetch().then(() => {
        enqueueSnackbar("Profile setup completed successfully!", {
          variant: "success",
          key: "account-setup-success",
        });
        form.reset();
        reset();
        onComplete?.();
      });
    }
  }, [
    isTransactionConfirmed,
    refetch,
    onComplete,
    form,
    enqueueSnackbar,
    reset,
  ]);

  const handleNext = async () => {
    // Validate account info step before moving forward
    if (activeStep === 0) {
      const isValid = await form.trigger();

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
      // The submit function already handles calling mutateProfile with the form data
      await onSubmit();

      // Success message will be shown after transaction confirmation
      // by the useEffect hook above
    } catch (err) {
      console.error("Error creating/updating profile:", err);

      if (err instanceof ValidationError) {
        const hasReferralError = err.details?.referralCode;

        if (hasReferralError) {
          setActiveStep(0);
        }

        const hasAccountInfoError =
          err.details?.name || err.details?.bio || err.details?.imageUrl;

        if (hasAccountInfoError) {
          setActiveStep(1);
        }

        enqueueSnackbar("Validation error occurred. Please check your input.", {
          variant: "error",
        });
      } else {
        enqueueSnackbar(
          parseErrorMessage(
            err,
            "An unexpected error occurred while creating/updating profile.",
          ),
          { variant: "error" },
        );
      }
    }
  };

  // Determine loading text based on state
  const getLoadingText = () => {
    if (isUploadingToIpfs) {
      return "Uploading to IPFS...";
    }
    if (isWritingContract) {
      return "Confirm transaction...";
    }
    if (isTransactionPending) {
      return "Confirming...";
    }
    return "Saving...";
  };

  return (
    <Box
      sx={{
        mx: { xs: 2, sm: 4, lg: 19 },
        my: { xs: 2, sm: 3, md: 5 },
      }}
    >
      <Wizard
        title="Account Setup"
        steps={steps}
        activeStep={activeStep}
        onNext={handleNext}
        onBack={handleBack}
        onFinish={handleFinish}
        nextDisabled={form.formState.isValid}
        showReset={false}
        minHeight={{ xs: 400, sm: 554 }}
        isLoading={isMutatingProfile}
        loadingText={getLoadingText()}
        showActions={!isWrongNetwork}
      >
        {activeStep === 0 && <AccountInfoStep />}
        {activeStep === 1 && <ReviewStep />}
      </Wizard>
      {/* Toasts handled by notistack */}
    </Box>
  );
};

export const AccountSetupWizard = ({
  onComplete,
}: {
  onComplete?: () => void;
}) => {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return null;
  }

  return (
    <AccountSetupProvider>
      <AccountSetupWizardContent onComplete={onComplete} />
    </AccountSetupProvider>
  );
};
