/**
 * Formats a UNIX timestamp (in seconds) to a human-readable date + time string.
 *
 * @param timestamp - The UNIX timestamp in seconds.
 * @returns A formatted date and time string.
 */
export function formatDateTime(timestamp: string | bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats a UNIX timestamp (in seconds) to a human-readable date string.
 *
 * @param timestamp - The UNIX timestamp in seconds.
 * @returns A formatted date string.
 */
export function formatDate(timestamp: string | bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Returns a relative time string (e.g. "5min ago", "2h ago") for recent
 * timestamps, and falls back to a formatted date for older ones.
 *
 * @param timestamp - The UNIX timestamp in seconds.
 * @param now - Optional reference time in milliseconds (defaults to Date.now()).
 * @returns A relative or formatted date string.
 */
export function formatRelativeTime(
  timestamp: string | bigint | number,
  now?: number,
): string {
  const tsMs = Number(timestamp) * 1000;
  const nowMs = now ?? Date.now();

  if (tsMs > nowMs) return formatDate(timestamp);
  const diffMs = nowMs - tsMs;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatDate(timestamp);
}
