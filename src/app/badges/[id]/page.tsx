import { getQueryClient } from "@/lib/tanstack-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BadgeDetails } from "@/components/Badges/BadgeDetails";
import { fetchBadge } from "@/components/Badges/utils";

export default async function BadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: ["badge", id],
      queryFn: () => fetchBadge(id),
    });
  } catch (error) {
    console.error("Error prefetching badges:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BadgeDetails id={id} />
    </HydrationBoundary>
  );
}
