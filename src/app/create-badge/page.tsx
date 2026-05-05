import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { BadgeCreationWizard } from "@/components/Badges/BadgeCreation/BadgeCreationWizard";
import { ContentGuard } from "@/components/Bubbles/ContentGuard";
import { Page } from "@/components/Page/Page";

export const metadata = {
  title: "Create Badge",
  description: "Create a new badge on Society Protocol.",
};

export default function CreateBadgePage() {
  return (
    <Page wideMargin backButton defaultBackPath="/badges">
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
    </Page>
  );
}
