import { fetchCommunity } from "@/data/communities/utils";
import { Page } from "@/components/Page/Page";
import { Metadata } from "next";
import { Box } from "@mui/material";
import { notFound } from "next/navigation";
import { CommunityDetailsPage } from "@/components/Communities/CommunityDetails/CommunityDetailsPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Community #${id}`,
    description: `View details for Community #${id} on Society Protocol.`,
  };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let communityExists = false;
  try {
    const data = await fetchCommunity(id);
    communityExists = !!data?.community;
  } catch (error) {
    console.error("Error fetching community", {
      communityId: id,
      error,
    });
  }

  if (!communityExists) {
    notFound();
  }

  return (
    <Page backButton defaultBackPath="/communities">
      <Box
        sx={{
          py: 3,
        }}
      >
        <CommunityDetailsPage id={id} />
      </Box>
    </Page>
  );
}
