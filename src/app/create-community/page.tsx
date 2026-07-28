import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { CommunityCreationWizard } from "@/components/Communities/CommunityCreation/CommunityCreationWizard";
import { ContentGuard } from "@/components/Bubbles/ContentGuard";
import { Page } from "@/components/Page/Page";

export const metadata = {
  title: "Create Community",
  description: "Create a new community on Society Protocol.",
};

export default function CreateCommunityPage() {
  return (
    <Page wideMargin backButton defaultBackPath="/communities">
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
          connectWalletMessage="Please connect your wallet to create a community."
        >
          <CommunityCreationWizard />
        </ContentGuard>
      </Suspense>
    </Page>
  );
}
