import { useMemo } from "react";
import { useFetch } from "@/hooks/useFetch";

const EXCLUDED_KEYS = new Set(["imageUrl"]);

/**
 * Fetches badge metadata from an IPFS URI and returns a sanitised JSON string
 * with display-only keys (e.g. `imageUrl`) removed.
 * Returns `null` while loading or when no meaningful keys remain.
 */
export function useBadgeMetadata(uri: string | null | undefined): {
  metadataString: string | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useFetch<Record<string, unknown>>(uri ?? null, {
    enabled: !!uri,
    staleTime: Infinity,
  });

  const metadataString = useMemo(() => {
    if (!data) return null;
    const sanitised = Object.fromEntries(
      Object.entries(data).filter(([k]) => !EXCLUDED_KEYS.has(k)),
    );
    return Object.keys(sanitised).length > 0
      ? JSON.stringify(sanitised, null, 2)
      : null;
  }, [data]);

  return { metadataString, isLoading };
}
