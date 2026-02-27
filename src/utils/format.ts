/**
 * Formats a number to a fixed number of decimal places.
 *
 * @param value The number or string to format
 * @param decimals The number of decimal places to include
 * @returns The formatted number as a string
 */
export const formatExact = (
  value: number | string,
  decimals: number,
): string => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return String(num);
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Trims unnecessary trailing zeros from a formatted number string.
 *
 * @param formatted The formatted number string
 * @returns The trimmed number string
 */
const trimZeros = (formatted: string): string => {
  if (!formatted.includes(".")) return formatted;

  return formatted
    .replace(/(\.\d*?[1-9])0+$/, "$1") // remove trailing zeros
    .replace(/\.$/, ""); // remove dangling dot
};

/**
 *  Formats a number with an adaptive number of decimal places based on its magnitude.
 *  Examples:
 *   - 0.00012345 with maxDecimals 6 -> "0.000123"
 *   - 1.2345 with maxDecimals 6 -> "1.2345"
 *   - 12345.6789 with maxDecimals 6 -> "12,345.68"
 *   - 12345678 with maxDecimals 6 -> "12,345,678"
 *   - -0.00098765 with maxDecimals 4 -> "-0.00099"
 *   - 1.2 with minDecimals 3 and maxDecimals 6 -> "1.200"
 *   - 0.0005 with minDecimals 2 and maxDecimals 6 -> "0.00050"
 *   - 123456 with minDecimals 2 and maxDecimals 6 -> "123,456.00"
 *   - 0 with minDecimals 4 and maxDecimals 6 -> "0.0000"
 *   - -0.0043 with minDecimals 4 and maxDecimals 6 -> "-0.0043"
 *   - 0.00000045 with minDecimals 2 and maxDecimals 6 and minThreshold 0.000001 -> "< 0.000001"
 *   - 0.0000023 with minDecimals 2 and maxDecimals 6 and minThreshold 0.000001 -> "0.0000023"
 *   - 1000000000 with minDecimals 2 and maxDecimals 6 and minThreshold 0.000001 -> "1,000,000,000.00"
 * @param value The number or string to format
 * @param minDecimals Minimum number of decimal places to include
 * @param maxDecimals Maximum number of decimal places to include
 * @param minThreshold Minimum threshold below which to display as "< minThreshold"
 * @returns The formatted number as a string
 */
export const formatAuto = (
  value: number | string,
  options?: {
    minDecimals?: number;
    maxDecimals?: number;
    minThreshold?: number;
    trimTrailingZeros?: boolean;
    compact?: boolean;
    prefix?: string;
  },
): string => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return String(num);
  }

  const abs = Math.abs(num);

  if (abs === 0) {
    return "0";
  }

  // Order of magnitude (base 10)
  const magnitude = Math.floor(Math.log10(abs));

  const {
    minDecimals = 0,
    maxDecimals = 6,
    minThreshold = 1e-6,
    trimTrailingZeros = false,
    compact = false,
  } = options || {};

  // Too small → threshold display
  if (minThreshold !== undefined && abs < minThreshold) {
    return `< ${options?.prefix ?? ""}${minThreshold}`;
  }

  const decimalsToShow = Math.min(
    maxDecimals,
    Math.max(minDecimals ?? 0, maxDecimals - magnitude - 1),
  );

  const formatted = new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    compactDisplay: "short",
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimalsToShow,
  }).format(num);

  return trimTrailingZeros ? trimZeros(formatted) : formatted;
};
