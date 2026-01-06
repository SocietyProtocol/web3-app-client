import { useQuery } from "@tanstack/react-query";
import { URLS } from "@/config/const";

export function useIpfsJson<T = unknown>(cid?: string | null) {
  return useQuery<T | null>({
    queryKey: ["ipfsJson", cid],
    queryFn: async () => {
      if (!cid || typeof cid !== "string") {
        return null;
      }
      const primaryUrl = `${URLS.IPFS_GATEWAY}/${cid}`;

      try {
        const res = await fetch(primaryUrl);

        if (res.ok) {
          const json = (await res.json()) as T;
          return json;
        }

        // If primary gateway responds with a non-ok status, fall through to fallback.
      } catch {
        // If primary gateway fetch fails, fall through to fallback.
      }

      const fallbackUrl = `${URLS.IPFS_FALLBACK_GATEWAY}/${cid}`;

      const fallbackRes = await fetch(fallbackUrl);

      if (!fallbackRes.ok) {
        throw new Error("Failed to fetch profile data from IPFS");
      }

      const json = (await fallbackRes.json()) as T;

      return json;
    },
    enabled: Boolean(cid),
    staleTime: Infinity,
    retry: 2,
  });
}
