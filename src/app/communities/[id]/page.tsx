import { getQueryClient } from "@/lib/tanstack-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { CommunityDetail } from "@/components/Communities/Detail/CommunityDetail";
import { fetchCommunity } from "@/data/communities/utils";
import { Page } from "@/components/Page/Page";
import { Metadata } from "next";
import { Box } from "@mui/material";
import { notFound } from "next/navigation";

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

  const queryClient = getQueryClient();

  let communityExists = false;
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["community", id],
      queryFn: () => fetchCommunity(id),
    });
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
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Page backButton defaultBackPath="/communities">
        <Box
          sx={{
            py: 3,
          }}
        >
          <CommunityDetail id={id} />
        </Box>
      </Page>
    </HydrationBoundary>
  );
}
