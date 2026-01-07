import { Address } from "viem";

/**
 * Truncates an Ethereum address for display purposes.
 *
 * @param address - The Ethereum address to truncate.
 * @param [length=6] - Number of characters to show at the start and end of the address.
 * @returns Truncated address in the format '0x123456...abcdef'.
 */
export const truncateAddress = (address: Address, length = 6): string => {
  if (address.length <= length * 2 + 2) {
    return address;
  }
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};
