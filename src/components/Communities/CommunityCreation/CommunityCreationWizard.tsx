"use client";

import { useState, useMemo } from "react";
import { useSnackbar } from "notistack";
import { Wizard, WizardStep } from "../../Wizard";
import { CommunityInfoStep } from "./CommunityInfoStep";
import { BadgeDetailsStep } from "./BadgeDetailsStep";
import { CommunityReviewStep } from "./CommunityReviewStep";
import {
  CommunityCreationProvider,
  useCommunityCreation,
} from "./CommunityCreationContext";
import { useAccount } from "wagmi";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { parseErrorMessage } from "@/utils/errors";
import { CommunityPreview } from "./CommunityPreview";
import { useWatch } from "react-hook-form";
import Link from "next/link";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const steps: WizardStep[] = [
  { label: "Community Info", description: "Logo, name & description" },
  { label: "Badge Details", description: "Manager & member badge settings" },
  { label: "Review", description: "Review and submit" },
];

const CommunityCreatedScreen = ({
  communityId,
  communityName,
  communityImage,
}: {
  communityId: bigint;
  communityName: string;
  communityImage: string | null;
}) => {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={3}
      sx={{ py: 8, px: 4, textAlign: "center" }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 72, color: "success.main" }} />

      <Typography variant="h4" component="h2" color="primary.main">
        Community Created!
      </Typography>

      <Avatar
        src={communityImage ?? undefined}
        alt={communityName}
        sx={{ width: 80, height: 80 }}
      >
        {!communityImage && communityName
          ? communityName.charAt(0).toUpperCase()
          : undefined}
      </Avatar>

      <Typography variant="h6">{communityName}</Typography>

      <Typography variant="body1" color="text.secondary">
        Your community has been successfully created on-chain.
      </Typography>

      <Button
        component={Link}
        href={`/communities/${communityId.toString()}`}
        variant="contained"
        size="large"
        sx={{ mt: 1 }}
      >
        View Community
      </Button>
    </Stack>
  );
};

const CommunityCreationWizardContent = () => {
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
    createdCommunityId,
  } = useCommunityCreation();

  const { address } = useAccount();
  const { isWrongNetwork, expectedNetwork } = useCheckWrongNetwork();

  const [name, creatorBadgeImageUrl, description] = useWatch({
    control: form.control,
    name: ["name", "creatorBadgeImageUrl", "description"],
  });

  const nextDisabled = useMemo(() => {
    if (activeStep === 0) {
      return !name || !description;
    }
    return false;
  }, [activeStep, name, description]);

  const handleNext = async () => {
    if (activeStep === 0) {
      const isValid = await form.trigger(["name", "description"]);
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
    } catch (err) {
      console.error("Error creating community:", err);
      enqueueSnackbar(
        parseErrorMessage(
          err,
          "An unexpected error occurred while creating the community.",
        ),
        { variant: "error" },
      );
    }
  };

  const loadingText = useMemo(() => {
    if (isUploadingToIpfs) return "Uploading metadata to IPFS...";
    if (isTransactionPending) return "Waiting for transaction confirmation...";
    if (isSyncing) return "Waiting for subgraph to sync...";
    if (isWritingContract) return "Waiting for wallet confirmation...";
    return "Saving...";
  }, [isUploadingToIpfs, isTransactionPending, isSyncing, isWritingContract]);

  if (createdCommunityId !== null) {
    return (
      <CommunityCreatedScreen
        communityId={createdCommunityId}
        communityName={name}
        communityImage={creatorBadgeImageUrl}
      />
    );
  }

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={4}
      sx={{ width: "100%" }}
    >
      <Box sx={{ flex: { xs: 1, md: 2 } }}>
        <Wizard
          title="Create Community"
          steps={steps}
          activeStep={activeStep}
          onNext={handleNext}
          onBack={handleBack}
          onFinish={handleFinish}
          nextDisabled={nextDisabled}
          backDisabled={activeStep === 0}
          finishDisabled={!name || !description}
          isLoading={isMutating || isSyncing}
          loadingText={loadingText}
          minHeight={{ xs: 400, sm: 500, md: 600 }}
        >
          {activeStep === 0 && <CommunityInfoStep />}
          {activeStep === 1 && <BadgeDetailsStep />}
          {activeStep === 2 && <CommunityReviewStep />}
        </Wizard>
      </Box>
      <Box
        sx={{
          flex: { xs: 0, md: 1 },
          display: { xs: "none", xl: "block" },
          maxWidth: 300,
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 24,
          }}
        >
          <CommunityPreview name={name} imageUrl={creatorBadgeImageUrl} />
        </Box>
      </Box>
    </Stack>
  );
};

export const CommunityCreationWizard = () => {
  return (
    <CommunityCreationProvider>
      <CommunityCreationWizardContent />
    </CommunityCreationProvider>
  );
};
