import { firstBadgeStatus } from "@/lib/aa/first-badge-status";

export const runtime = "nodejs";

/** GET /api/aa/first-badge?chainId=&sender=: does this account still have its free badge. */
export function GET(request: Request) {
  return firstBadgeStatus(request);
}
