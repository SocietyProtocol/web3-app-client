import { Address } from "viem";

/**
 * Every address the connected member may act as: the Society address (S)
 * and the wallet that owns it (E). Rights granted before the migration
 * stay on E, so permission checks must accept either.
 */
export const identityAddresses = (
  address?: string,
  ownerAddress?: string,
): Address[] => {
  const seen = new Set<string>();
  const result: Address[] = [];

  for (const candidate of [address, ownerAddress]) {
    if (!candidate) continue;
    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate as Address);
  }

  return result;
};

/** The first of `addresses` equal to `target`, ignoring case. */
export const findIdentity = (
  target: string | null | undefined,
  addresses: readonly string[],
): Address | undefined => {
  if (!target) return undefined;
  const key = target.toLowerCase();
  return addresses.find((a) => a.toLowerCase() === key) as Address | undefined;
};

/** True if any of `addresses` is in `holders`, ignoring case. */
export const holdsAny = (
  holders: readonly string[] | undefined,
  addresses: readonly string[],
): boolean => {
  if (!holders?.length || !addresses.length) return false;
  const set = new Set(holders.map((h) => h.toLowerCase()));
  return addresses.some((a) => set.has(a.toLowerCase()));
};
