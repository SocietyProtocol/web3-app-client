/**
 * "1 holder", "2 holders". The subgraph serialises `holdersCount` (a BigInt
 * field) as a string, so the count is converted before it is compared.
 */
export function holdersLabel(holdersCount?: number | string | null): string {
  const count = Number(holdersCount ?? 0);
  return `${count} ${count === 1 ? "holder" : "holders"}`;
}
