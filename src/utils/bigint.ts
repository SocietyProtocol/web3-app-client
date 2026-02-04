/**
 * Scales up a bigint value by a given number of decimals.
 *
 * @param value The bigint value to scale up
 * @param decimals The number of decimals to scale up by
 * @returns The scaled up bigint value
 */
export const scaleUp = (value: bigint, decimals: number): bigint => {
  const scaleFactor = BigInt(10) ** BigInt(decimals);

  return value * scaleFactor;
};

/**
 * Scales down a bigint value by a given number of decimals.
 *
 * @param value The bigint value to scale down
 * @param decimals The number of decimals to scale down by
 * @returns The scaled down bigint value
 */
export const scaleDown = (value: bigint, decimals: number): bigint => {
  const scaleFactor = BigInt(10) ** BigInt(decimals);

  return value / scaleFactor;
};

/**
 * Returns the minimum bigint from a list of bigints.
 *
 * @param numbers The list of bigint numbers
 * @returns The minimum bigint
 */
export const min = (...numbers: bigint[]): bigint => {
  return numbers.reduce((min, curr) => (curr < min ? curr : min), numbers[0]);
};
