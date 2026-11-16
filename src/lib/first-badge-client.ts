import { Address } from "viem";

export type FirstBadgeAnswer = { enabled: boolean; eligible: boolean };

const NOT_ELIGIBLE: FirstBadgeAnswer = { enabled: false, eligible: false };

export function firstBadgeStatusUrl(chainId: number, sender: Address) {
  const params = new URLSearchParams({ chainId: String(chainId), sender });
  return `/api/aa/first-badge?${params.toString()}`;
}

/**
 * Asks the server whether Society pays for this account's next createBadge
 * (its free first badge). Any failure answers "no": the wallet then pays,
 * as it does for every badge without the feature.
 */
export async function fetchFirstBadgeStatus(
  chainId: number,
  sender: Address,
  fetcher: typeof fetch = fetch,
): Promise<FirstBadgeAnswer> {
  try {
    const response = await fetcher(firstBadgeStatusUrl(chainId, sender), {
      cache: "no-store",
    });
    if (!response.ok) return NOT_ELIGIBLE;
    const body = (await response.json()) as Partial<FirstBadgeAnswer>;
    return { enabled: body.enabled === true, eligible: body.eligible === true };
  } catch {
    return NOT_ELIGIBLE;
  }
}
