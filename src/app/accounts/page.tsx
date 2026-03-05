import { Accounts } from "@/components/Accounts/Accounts";
import { Page } from "@/components/Page/Page";
import { defaultOptions } from "@/data/users/consts";
import { fetchUsers } from "@/data/users/utils";
import { getQueryClient } from "@/lib/tanstack-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

export default async function AccountsPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ["users", defaultOptions],
      queryFn: () => fetchUsers(),
      initialPageParam: 0,
    });
  } catch (error) {
    console.error("Error prefetching accounts:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Page title="Accounts">
        <Suspense>
          <Accounts />
        </Suspense>
      </Page>
    </HydrationBoundary>
  );
}
