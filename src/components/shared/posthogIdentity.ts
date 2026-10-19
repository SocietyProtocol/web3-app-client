interface PostHogIdentityClient {
  identify: (
    distinctId: string,
    userPropertiesToSet?: Record<string, unknown>,
  ) => void;
  capture: (event: string, properties?: Record<string, unknown>) => unknown;
}

type MergeStore = Pick<Storage, "getItem" | "setItem">;

const MERGE_KEY_PREFIX = "outpost_posthog_merged:";
/** Fallback when storage is unavailable (private mode, blocked site data). */
const mergedThisSession = new Set<string>();

const browserStore = (): MergeStore | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

/**
 * Identifies the member by their Society address (S). When S has an owner
 * wallet (E), E's person is merged into S's.
 *
 * Before the Light Account migration the app called identify(E), so E is
 * usually an identified person. PostHog ignores alias(E, S) ($create_alias)
 * when the alias already belongs to an identified person, and identify(S)
 * from an identified session does not merge either. Only $merge_dangerously
 * merges an identified id into the current one, so that is what we send.
 * It is sent once per device and pair (remembered in localStorage).
 *
 * Returns the merged pair key, if E and S differ.
 */
export const identifyOutpostPerson = (
  client: PostHogIdentityClient,
  address: string,
  ownerAddress?: string,
  store: MergeStore | undefined = browserStore(),
): string | undefined => {
  const societyAddress = address.toLowerCase();
  const owner = ownerAddress?.toLowerCase();

  client.identify(societyAddress, {
    society_address: societyAddress,
    ...(owner ? { owner_address: owner } : {}),
  });

  if (!owner || owner === societyAddress) return undefined;

  const mergeKey = `${owner}:${societyAddress}`;
  if (mergedThisSession.has(mergeKey)) return mergeKey;
  try {
    if (store?.getItem(MERGE_KEY_PREFIX + mergeKey)) {
      mergedThisSession.add(mergeKey);
      return mergeKey;
    }
  } catch {
    // Unreadable storage: fall through and merge (merging twice is harmless).
  }

  // Must follow identify(S): the event's distinct id is the merge target.
  client.capture("$merge_dangerously", { alias: owner });
  mergedThisSession.add(mergeKey);
  try {
    store?.setItem(MERGE_KEY_PREFIX + mergeKey, "1");
  } catch {
    // Remembered for this page load only.
  }
  return mergeKey;
};

/** Test hook: forget merges remembered in memory. */
export const resetPostHogMergeMemory = () => mergedThisSession.clear();
