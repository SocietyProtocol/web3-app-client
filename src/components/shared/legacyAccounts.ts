import { Address, getAddress, isAddress } from "viem";
import legacyAccountMap from "@/consts/legacy-account-map.json";

/**
 * Members who held a profile on their wallet (E) before Light Accounts
 * were migrated to a Society address (S). The JSON is either flat
 * ({ eoa: S }) or keyed by chain id ({ "1": { eoa: S }, ... }).
 */
type FlatLegacyMap = Record<string, string>;
type ChainKeyedLegacyMap = Record<string, FlatLegacyMap>;

const isChainKeyed = (
  map: FlatLegacyMap | ChainKeyedLegacyMap,
): map is ChainKeyedLegacyMap =>
  Object.entries(map).some(
    ([key, value]) =>
      /^\d+$/.test(key) && typeof value === "object" && value !== null,
  );

const normalize = (map: FlatLegacyMap): Record<string, Address> =>
  Object.fromEntries(
    Object.entries(map)
      .filter(([eoa, smart]) => isAddress(eoa) && isAddress(smart))
      .map(([eoa, smart]) => [eoa.toLowerCase(), getAddress(smart)]),
  );

/**
 * Returns the legacy EOA -> Society address map for a chain.
 * A flat map applies to every chain.
 */
export const legacyAccountsFor = (
  chainId: number | undefined,
  source: unknown = legacyAccountMap,
): Record<string, Address> => {
  if (!source || typeof source !== "object") return {};

  const map = source as FlatLegacyMap | ChainKeyedLegacyMap;

  if (!isChainKeyed(map)) return normalize(map);
  if (chainId === undefined) return {};

  return normalize(map[String(chainId)] ?? {});
};

/** Society address of a legacy wallet, if it is in the map. */
export const legacySocietyAddress = (
  eoa: string | undefined,
  chainId: number | undefined,
  source?: unknown,
): Address | undefined => {
  if (!eoa) return undefined;
  return legacyAccountsFor(chainId, source)[eoa.toLowerCase()];
};

/** Wallet (owner) of a Society address, if it is in the map. */
export const legacyOwnerOf = (
  societyAddress: string | undefined,
  chainId: number | undefined,
  source?: unknown,
): Address | undefined => {
  if (!societyAddress) return undefined;

  const target = societyAddress.toLowerCase();
  const entry = Object.entries(legacyAccountsFor(chainId, source)).find(
    ([, smart]) => smart.toLowerCase() === target,
  );

  return entry ? getAddress(entry[0]) : undefined;
};

export interface ResolvedRecipient {
  address: string;
  /** Set when a legacy wallet was replaced by its Society address. */
  mappedFrom?: Address;
}

/** Replaces a legacy wallet with its Society address; others pass through. */
export const resolveRecipient = (
  input: string,
  chainId: number | undefined,
  source?: unknown,
): ResolvedRecipient => {
  const trimmed = input.trim();
  const smart = isAddress(trimmed, { strict: false })
    ? legacySocietyAddress(trimmed, chainId, source)
    : undefined;

  return smart
    ? { address: smart, mappedFrom: getAddress(trimmed) }
    : { address: trimmed };
};

/** resolveRecipient over a list, de-duplicated case-insensitively. */
export const resolveRecipients = (
  inputs: string[],
  chainId: number | undefined,
  source?: unknown,
): { addresses: string[]; mapped: Array<{ from: Address; to: Address }> } => {
  const seen = new Set<string>();
  const addresses: string[] = [];
  const mapped: Array<{ from: Address; to: Address }> = [];

  for (const input of inputs) {
    const resolved = resolveRecipient(input, chainId, source);
    if (resolved.mappedFrom) {
      mapped.push({
        from: resolved.mappedFrom,
        to: resolved.address as Address,
      });
    }

    const key = resolved.address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(resolved.address);
  }

  return { addresses, mapped };
};

/** Swaps `from` for `to` in a recipient list, keeping order, no duplicates. */
export const replaceRecipient = (
  recipients: string[],
  from: string,
  to: string,
): string[] => {
  const fromKey = from.toLowerCase();
  const result: string[] = [];
  const seen = new Set<string>();

  for (const recipient of recipients) {
    const next = recipient.toLowerCase() === fromKey ? to : recipient;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(next);
  }

  return result;
};
