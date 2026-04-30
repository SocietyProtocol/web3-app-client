import { getQueryClient } from "@/lib/tanstack-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { CommunityDetail } from "@/components/Communities/Detail/CommunityDetail";
import { fetchCommunity } from "@/data/communities/utils";
import { Page } from "@/components/Page/Page";
import { Metadata } from "next";
import { Box } from "@mui/material";

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

  try {
    await queryClient.prefetchQuery({
      queryKey: ["community", id],
      queryFn: () => fetchCommunity(id),
    });
  } catch (error) {
    console.error("Error prefetching community", {
      communityId: id,
      error,
    });
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
