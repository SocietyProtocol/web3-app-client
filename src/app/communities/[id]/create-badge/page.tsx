import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Page } from "@/components/Page/Page";
import { ContentGuard } from "@/components/Bubbles/ContentGuard";
import { Metadata } from "next";
import { BadgeCreationWizard } from "@/components/Badges/BadgeCreation/BadgeCreationWizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Create Badge — Community #${id}`,
    description: `Create a new badge for Community #${id} on Society Protocol.`,
  };
}

export default async function CreateCommunityBadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Page
      wideMargin
      backButton
      defaultBackPath={`/communities/${id}?tab=badges`}
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
          <BadgeCreationWizard communityId={id} />
        </ContentGuard>
      </Suspense>
    </Page>
  );
}
