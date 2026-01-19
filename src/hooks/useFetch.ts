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
  options?: UseQueryOptions<T>
): ReturnType<typeof useQuery<T>> =>
  useQuery<T>({
    queryKey: ["fetch", url],
    queryFn: async () => {
      if (!url) {
        throw new Error("URL is undefined");
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`);
      }
      const data = (await response.json()) as T;
      return data;
    },
    retry: 2,
    staleTime: Infinity,
    enabled: typeof url === "string" && isValidUrl(url),
    ...options,
  });
