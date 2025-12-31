import { useState } from "react";
import { useSnackbar } from "notistack";
import { Wizard, WizardStep } from "../Wizard";
import { ReferralStep } from "./ReferralStep";
import { AccountInfoStep } from "./AccountInfoStep";
import { ReviewStep } from "./ReviewStep";
import { AccountSetupProvider, useAccountSetup } from "./AccountSetupContext";
import { useAccount } from "wagmi";
import { useUpdateProfile } from "./useUpdateProfile";
import { Box } from "@mui/material";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";

const steps: WizardStep[] = [
  { label: "Referral", description: "Enter your referral code" },
  { label: "Account Info", description: "Set up your profile" },
  { label: "Review", description: "Review your information" },
];

const AccountSetupWizardContent = () => {
  const [activeStep, setActiveStep] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const { referralCode, name, bio, avatar } = useAccountSetup();
  const { createProfile, isMutating: isCreating } = useUpdateProfile();
  const { address } = useAccount();
  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();

  const handleNext = () => {
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
      await createProfile({
        name,
        bio,
        avatar,
        referralCode: referralCode || undefined,
      });
      enqueueSnackbar("Profile created or updated successfully!", {
        variant: "success",
      });
      // TODO: Wait for transaction confirmation and navigate to profile page
    } catch (err) {
      console.error("Error creating/updating profile:", err);
      enqueueSnackbar(
        err instanceof Error ? err.message : "Failed to create profile",
        { variant: "error" }
      );
    }
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
        showReset={false}
        minHeight={{ xs: 400, sm: 554 }}
        isLoading={isCreating}
        showActions={!isWrongNetwork}
      >
        {activeStep === 0 && <ReferralStep />}
        {activeStep === 1 && <AccountInfoStep />}
        {activeStep === 2 && <ReviewStep />}
      </Wizard>
      {/* Toasts handled by notistack */}
    </Box>
  );
};

export const AccountSetupWizard = () => {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return null;
  }

  return (
    <AccountSetupProvider>
      <AccountSetupWizardContent />
    </AccountSetupProvider>
  );
};
