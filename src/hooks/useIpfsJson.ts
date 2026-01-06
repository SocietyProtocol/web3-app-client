import { useQuery } from "@tanstack/react-query";
import { URLS } from "@/config/const";

export function useIpfsJson<T = unknown>(cid?: string | null) {
  return useQuery<T | null>({
    queryKey: ["ipfsJson", cid],
    queryFn: async () => {
      if (!cid || typeof cid !== "string") {
        return null;
      }
      const url = `${URLS.IPFS_GATEWAY}/${cid}`;
      const res = await fetch(url);

      // If primary gateway fails with 403, try fallback
      if (res.status === 403) {
        const fallbackUrl = `${URLS.IPFS_FALLBACK_GATEWAY}/${cid}`;

        const fallbackRes = await fetch(fallbackUrl);

        if (!fallbackRes.ok) {
          throw new Error("Failed to fetch profile data from IPFS");
        }
        const json = (await fallbackRes.json()) as T;
        return json;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch profile data from IPFS");
      }

      const json = (await res.json()) as T;
      return json;
    },
    enabled: Boolean(cid),
    staleTime: Infinity,
    retry: false,
  });
}
