import { Address, Hex } from "viem";
import { SponsorshipUnavailableError } from "@/lib/aa/errors";
import { OutpostRoute } from "@/lib/outpost-routing";
import {
  OwnerPaysQuote,
  OwnerPaysStep,
  OwnerPaysWallet,
  freeGasUnavailableNoFundsMessage,
  ownerCanPay,
  sendOwnerPaysThroughAccount,
} from "@/lib/owner-pays";
import { AccountCall } from "@/lib/smart-account";

export type OutpostSendDeps = {
  /** Society pays. Throws SponsorshipUnavailableError when it cannot. */
  sendSponsored(): Promise<Hex>;
  /** The connected wallet sends the call itself (writeContract / sendCalls). */
  sendAsOwner(): Promise<Hex>;
  /** The call as the Light Account. Rejects with the call's own revert. */
  simulateAsAccount(): Promise<unknown>;
  /** Price of the owner-paid transaction through the Light Account. */
  quoteOwnerPays(): Promise<OwnerPaysQuote>;
  /** The owner wallet. Only asked for when the wallet pays through the account. */
  ownerWallet(): Promise<OwnerPaysWallet>;
  /** Tells the user that free gas is unavailable and what their wallet will pay. */
  onSponsorshipUnavailable?(quote: OwnerPaysQuote, reason: unknown): void;
  onOwnerPaysStep?(step: OwnerPaysStep, info: { steps: number }): void;
};

/**
 * Sends one write along its route.
 * A sponsored write falls back to "owner pays through the account" only when
 * Society could not sponsor it before the signature, and only after the call
 * is shown to succeed as the Light Account: a call that would revert is
 * reported as that revert, never retried at the owner's expense.
 */
export async function sendOutpostWrite(
  deps: OutpostSendDeps,
  input: {
    route: OutpostRoute;
    owner?: Address;
    /** The call the Light Account makes. Not read on the owner route. */
    call: () => AccountCall;
  },
): Promise<Hex> {
  const { route } = input;
  if (route.kind === "blocked") {
    throw route.error ?? new Error(route.message ?? "This action would fail");
  }
  if (route.kind === "owner") return deps.sendAsOwner();

  const owner = input.owner;
  if (!owner) throw new Error("Wallet is not connected");
  const throughAccount = async () =>
    sendOwnerPaysThroughAccount(await deps.ownerWallet(), {
      owner,
      calls: [input.call()],
      onStep: deps.onOwnerPaysStep,
    });

  if (route.kind === "owner-through-account") return throughAccount();

  try {
    return await deps.sendSponsored();
  } catch (error) {
    if (!(error instanceof SponsorshipUnavailableError)) throw error;
    await deps.simulateAsAccount();
    const quote = await deps.quoteOwnerPays();
    if (!ownerCanPay(quote)) {
      // No cause: the message shown must be this one, not the refusal's.
      throw new Error(freeGasUnavailableNoFundsMessage(owner, quote.costWei));
    }
    deps.onSponsorshipUnavailable?.(quote, error.cause);
    return throughAccount();
  }
}
