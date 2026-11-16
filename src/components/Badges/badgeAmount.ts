/**
 * Amount handling for the burn and transfer tabs.
 *
 * A holder can own several copies of a badge (ERC-1155), so burn and
 * transfer take an amount. It defaults to 1 and is capped by the holder's
 * on-chain balance. Profile badges are unique, so they always move one.
 */
import { Hex } from "viem";
import z from "zod";

export const DEFAULT_BADGE_AMOUNT = "1";

/** Form field: a whole number of at least 1, as a bigint. */
export const badgeAmountValidationSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Enter a whole number")
  .transform((value) => BigInt(value))
  .refine((value) => value >= BigInt(1), {
    message: "Amount must be at least 1",
  });

/**
 * Most copies one burn or transfer may take from the holder: their balance,
 * or 1 for a profile badge. `undefined` while the balance is unknown.
 */
export const maxBadgeAmount = (
  balance: bigint | undefined,
  isProfile: boolean,
): bigint | undefined => (isProfile ? BigInt(1) : balance);

/**
 * Whether to offer an amount input. Only when the holder has more than one
 * copy; otherwise the amount stays at 1.
 */
export const canChooseBadgeAmount = (max: bigint | undefined): boolean =>
  max !== undefined && max > BigInt(1);

/**
 * The amount to send: 1 when there is nothing to choose, else the parsed
 * input (`undefined` when it is not a valid whole number).
 */
export const badgeActionAmount = (
  input: string | undefined,
  max: bigint | undefined,
): bigint | undefined =>
  canChooseBadgeAmount(max)
    ? badgeAmountValidationSchema.safeParse(input).data
    : BigInt(1);

/** Error when the amount is above the holder's balance, else `undefined`. */
export const badgeAmountMaxError = (
  amount: bigint | undefined,
  max: bigint | undefined,
): string | undefined => {
  if (amount === undefined || max === undefined || amount <= max) {
    return undefined;
  }
  return max === BigInt(0)
    ? "This address holds none of this badge"
    : `The holder has only ${max}`;
};

/** `burn(from, id, value)` arguments; one copy unless an amount is given. */
export const burnBadgeCallArgs = ({
  holder,
  id,
  amount = BigInt(1),
}: {
  holder: Hex;
  id: bigint;
  amount?: bigint;
}): [Hex, bigint, bigint] => [holder, id, amount];

/** `safeTransferFrom(from, to, id, value, data)` arguments. */
export const transferBadgeCallArgs = ({
  from,
  to,
  id,
  amount,
}: {
  from: Hex;
  to: Hex;
  id: bigint;
  amount: bigint;
}): [Hex, Hex, bigint, bigint, "0x"] => [from, to, id, amount, "0x"];

/**
 * Burn arguments that take every copy the holder has, e.g. revoking a
 * community member. `undefined` until the balance is known and above 0.
 */
export const burnAllBadgeArgs = ({
  holder,
  id,
  balance,
}: {
  holder: Hex;
  id: bigint;
  balance: bigint | undefined;
}): { holder: Hex; id: bigint; amount: bigint } | undefined =>
  balance !== undefined && balance > BigInt(0)
    ? { holder, id, amount: balance }
    : undefined;
