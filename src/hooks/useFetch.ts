import { isValidUrl } from "@/utils/string";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

/**
 * A custom hook to fetch JSON data from a given URL.
 *
 * @param url The URL to fetch data from.
 * @param options Optional React Query options.
 *
 * @returns The result of the useQuery hook.
 */
export const useFetch = <T>(
  url?: string | null,
  options?: Partial<UseQueryOptions<T | null>>,
): ReturnType<typeof useQuery<T | null>> =>
  useQuery<T | null>({
    queryKey: ["fetch", url],
    queryFn: async () => {
      if (!url) {
        throw new Error("URL is undefined");
      }

      try {
        const response = await fetch(url);

        if (!response.ok) {
          return null;
        }
        const data = (await response.json()) as T;
        return data;
      } catch {
        return null;
      }
    },
    retry: 2,
    staleTime: Infinity,
    enabled: typeof url === "string" && isValidUrl(url),
    ...options,
  });
