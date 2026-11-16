import { formatUnits } from "viem";
import { formatAuto } from "../../../src/utils/format";
import { SPEC_DECIMALS } from "../../support/builders/lock-spec";

/**
 * What the Lock SPEC specs share: the page's own way of printing amounts
 * and dates, to compare what it shows with what is on chain. Not a spec:
 * files here that do not end in .spec.ts are not collected.
 */

/** An amount as the tier cards print it: "5,000 SPEC". */
export function specAmount(amount: bigint): string {
  return `${formatAuto(formatUnits(amount, SPEC_DECIMALS))} SPEC`;
}

/** An amount as the summary, the lock button, the Claim tab and the history print it: "5K SPEC". */
export function compactSpecAmount(amount: bigint): string {
  return `${formatAuto(formatUnits(amount, SPEC_DECIMALS), { compact: true })} SPEC`;
}

/** The wallet's balance under "Your balance": below 1000 SPEC the page only says "< 1000 SPEC". */
export function balanceShown(amount: bigint): string {
  return `${formatAuto(formatUnits(amount, SPEC_DECIMALS), { minThreshold: 1000 })} SPEC`;
}

/** A block time as the Claim tab and the history print it: "Nov 9, 2029". */
export function shortDate(seconds: bigint | number): string {
  return new Date(Number(seconds) * 1000).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The summary's "Unlock date" for a lock of that many years made at `from` (milliseconds): "November 2029". */
export function unlockMonth(years: number, from: number = Date.now()): string {
  return new Date(from + years * 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** "0x1234...abcdef": how the page shortens the wallet under the balance. */
export function shortened(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/** A row of the summary: its label, then its value, with nothing but layout in between. */
export function summaryRow(label: string, value: string): RegExp {
  const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${literal(label)}\\s*${literal(value)}`);
}
