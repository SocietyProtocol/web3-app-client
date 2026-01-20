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
