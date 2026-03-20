/**
 * Formats a UNIX timestamp (in seconds) to a human-readable date string.
 *
 * @param timestamp - The UNIX timestamp in seconds.
 * @returns A formatted date string.
 */
export function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
