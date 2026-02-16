import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { BadgeCreationWizard } from "@/components/Badges/BadgeCreation/BadgeCreationWizard";
import { ContentGuard } from "@/components/Bubbles/ContentGuard";

export default function CreateBadgePage() {
  return (
    <Box
      sx={{
        maxWidth: 1400,
        mx: "auto",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4, md: 5 },
      }}
    >
      <Suspense
        fallback={
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 400,
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        <ContentGuard
          requireNetwork
          connectWalletMessage="Please connect your wallet to create a badge."
        >
          <BadgeCreationWizard />
        </ContentGuard>
      </Suspense>
    </Box>
  );
}
