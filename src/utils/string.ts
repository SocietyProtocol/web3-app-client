import { Hex } from "viem";

/**
 * Truncates an Ethereum address for display purposes.
 *
 * @param {Hex} address - The Ethereum address to truncate.
 * @param {number} [length=6] - Number of characters to show at the start and end of the address.
 * @returns {string} Truncated address in the format '0x123456...abcdef'.
 */
export const truncateAddress = (address: Hex, length = 6): string => {
  if (address.length <= length * 2) {
    return address;
  }
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};
