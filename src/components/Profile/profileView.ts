export type ProfileView = "loading" | "error" | "content";

/**
 * What /profile shows for the member's User query.
 *
 * A query that failed without data is an error, not "no profile": rendering
 * the content then mounts ContentGuard, whose own observer on the failed query
 * makes TanStack Query fetch it again on mount (`retryOnMount`), which puts
 * the page back into its loading state, and so on forever.
 */
export const profileView = ({
  wagmiReady,
  isLoading,
  isError,
  hasData,
}: {
  wagmiReady: boolean;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}): ProfileView => {
  if (!wagmiReady || isLoading) return "loading";
  if (isError && !hasData) return "error";
  return "content";
};
