/**
 * Pure helpers for badge quantities (ERC-1155 balances and total supply).
 *
 * Quantities always come from the badges contract (`balanceOf`,
 * `totalSupply`), never from a hardcoded constant: the number of badges in
 * circulation changes whenever one is minted or burned.
 */

type Amount = bigint | number;

const toBig = (value: Amount): bigint => BigInt(value);

/** "2 / 15", or just "2" while the total is unknown. */
export const formatBadgeCount = (count: Amount, total?: Amount): string =>
  total === undefined ? `${count}` : `${count} / ${total}`;

/**
 * Share of the total supply held, as a percentage with two decimals
 * (e.g. 10 of 15 -> 66.67). `undefined` when the total is zero or unknown,
 * so callers never show "NaN%" or "Infinity%".
 */
export const votingPowerPercent = (
  count: Amount,
  total?: Amount,
): number | undefined => {
  if (total === undefined) return undefined;
  const totalBig = toBig(total);
  if (totalBig <= BigInt(0)) return undefined;
  const basisPoints = (toBig(count) * BigInt(10_000) + totalBig / BigInt(2)) / totalBig;
  return Number(basisPoints) / 100;
};

/** "66.67%" (trailing zeros trimmed: 50 -> "50%"). */
export const formatPercent = (percent: number): string =>
  `${Number(percent.toFixed(2))}%`;

/** "10 / 15 · 66.67%" for the governance page. */
export const formatVotingPower = (count: Amount, total?: Amount): string => {
  const percent = votingPowerPercent(count, total);
  const base = formatBadgeCount(count, total);
  return percent === undefined ? base : `${base} · ${formatPercent(percent)}`;
};
