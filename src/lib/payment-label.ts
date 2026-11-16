import type { OutpostRouteKind } from "@/lib/outpost-routing";

export const FREE_LABEL = "Free - you only sign";
export const PAID_LABEL = "Paid by your wallet";

export const CONFIRM_PROMPT = "Please confirm the transaction in your wallet";
export const SIGN_PROMPT = "Please sign the request in your wallet. It's free.";

/**
 * What the line next to a write button says about who pays.
 * - loading: the route or the fee is still being worked out.
 * - free: Society sponsors the write; the user only signs.
 * - paid: the connected wallet pays; feeUsd is the estimate when known.
 * null shows nothing: the route is unknown, or the write is blocked.
 */
export type PaymentLabel =
  | { kind: "loading" }
  | { kind: "free" }
  | { kind: "paid"; feeUsd?: bigint };

export function paymentLabel(input: {
  routeKind?: OutpostRouteKind;
  gas?: bigint;
  gasLoading?: boolean;
  gasError?: boolean;
}): PaymentLabel | null {
  if (input.gasLoading) return { kind: "loading" };
  switch (input.routeKind) {
    case "sponsored":
      return { kind: "free" };
    case "owner":
    case "owner-through-account":
      return {
        kind: "paid",
        feeUsd: input.gasError ? undefined : input.gas,
      };
    default:
      return null;
  }
}

/** The wallet prompt while a write waits for the user. */
export function walletPrompt(routeKind?: OutpostRouteKind): string {
  return routeKind === "sponsored" ? SIGN_PROMPT : CONFIRM_PROMPT;
}
