import { isAddress } from "viem";
import { aaRateLimits, clientIp } from "@/lib/aa/rate-limit";
import {
  FirstBadgeReads,
  FirstBadgeReason,
  firstBadgeEligibility,
  sponsorFirstBadgeEnabled,
} from "@/lib/aa/first-badge";
import { supportedAaChainId } from "@/lib/smart-account";

export type FirstBadgeStatus = {
  /** SPONSOR_FIRST_BADGE is on. */
  enabled: boolean;
  /** Society would pay for this sender's next createBadge (shape permitting). */
  eligible: boolean;
  reason?: FirstBadgeReason | "rate-limited";
};

const NO_STORE = { "cache-control": "no-store" };

/**
 * What the badge wizard asks before it picks a route. Advisory only: the
 * proxy runs the same check again (plus the nonce) when it is asked to
 * sponsor, and the wallet pays if that one says no.
 */
export async function firstBadgeStatus(
  request: Request,
  reads?: FirstBadgeReads,
): Promise<Response> {
  const url = new URL(request.url);
  const chainId = Number(url.searchParams.get("chainId"));
  const sender = url.searchParams.get("sender");
  if (!supportedAaChainId(chainId) || !sender || !isAddress(sender)) {
    return Response.json({ error: "chainId and sender are required" }, { status: 400, headers: NO_STORE });
  }
  if (!sponsorFirstBadgeEnabled(request)) {
    return Response.json({ enabled: false, eligible: false, reason: "disabled" } satisfies FirstBadgeStatus, {
      headers: NO_STORE,
    });
  }
  if (!aaRateLimits.firstBadgeChecksByIp.take(clientIp(request.headers))) {
    return Response.json(
      { enabled: true, eligible: false, reason: "rate-limited" } satisfies FirstBadgeStatus,
      { status: 429, headers: NO_STORE },
    );
  }
  const result = await firstBadgeEligibility({ chainId, sender }, reads);
  const body: FirstBadgeStatus = result.eligible
    ? { enabled: true, eligible: true }
    : { enabled: true, eligible: false, reason: result.reason };
  return Response.json(body, { headers: NO_STORE });
}
