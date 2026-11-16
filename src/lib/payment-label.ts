import { Abi, encodeFunctionData } from "viem";
import {
  routeWithoutChain,
  type OutpostRouteKind,
} from "@/lib/outpost-routing";

export const FREE_LABEL = "Free - you only sign";
export const PAID_LABEL = "Paid by your wallet";

/**
 * Stands in for a metadata URI that is only uploaded on submit, so the
 * route and fee can be shown before the click. Same shape as the URIs
 * /api/profile returns, so a profile preview is sponsored like the real one.
 * Never sent.
 */
export const PREVIEW_METADATA_URI =
  "ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";

/** Who pays for a write and its fee, as useTransaction reports them. */
export type WritePayment = {
  routeKind?: OutpostRouteKind;
  gas?: bigint;
  gasLoading?: boolean;
  gasError?: boolean;
};

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

export function paymentLabel(input: WritePayment): PaymentLabel | null {
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

/**
 * The wallet prompt for a call about to be sent, chosen without the chain:
 * a signature for writes known to be sponsored, a transaction otherwise.
 */
export function pendingWalletPrompt({
  abi,
  functionName,
  args,
  ...input
}: Omit<Parameters<typeof routeWithoutChain>[0], "data"> & {
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}): string {
  let routeKind: OutpostRouteKind | undefined;
  try {
    const data = encodeFunctionData({
      abi: abi as Abi,
      functionName,
      args: args ?? [],
    });
    routeKind = routeWithoutChain({ ...input, data })?.kind;
  } catch {
    routeKind = undefined;
  }
  return walletPrompt(routeKind);
}

export const SIGN_WAIT_TEXT = "Waiting for your signature...";

/** Button text while the wallet prompt is open. */
export function walletWaitText(
  routeKind: OutpostRouteKind | undefined,
  paidText: string,
): string {
  return routeKind === "sponsored" ? SIGN_WAIT_TEXT : paidText;
}
