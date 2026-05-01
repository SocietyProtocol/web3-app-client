import { getQueryClient } from "@/lib/tanstack-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BadgeDetails } from "@/components/Badges/BadgeDetails";
import { fetchBadge } from "@/data/badges/utils";
import { Page } from "@/components/Page/Page";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Badge #${id}`,
    description: `View details and manage Badge #${id} on Society Protocol.`,
  };
}

export default async function BadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const queryClient = getQueryClient();

  let badgeExists = false;
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["badge", id],
      queryFn: () => fetchBadge(id),
    });
    badgeExists = !!data?.badge;
  } catch (error) {
    console.error("Error prefetching badge:", error);
  }

  if (!badgeExists) {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Page backButton defaultBackPath="/badges">
        <BadgeDetails id={id} />
      </Page>
    </HydrationBoundary>
  );
}
