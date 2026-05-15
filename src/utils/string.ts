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

/**
 * Validates whether a given string is a well-formed URL.
 *
 * @param urlString - The string to validate as a URL.
 * @returns True if the string is a valid URL, false otherwise.
 */
export const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Compares two strings for equality, ignoring case differences.
 *
 * @param str1 The first string to compare.
 * @param str2 The second string to compare.
 * @returns True if the strings are equal case-insensitively, false otherwise.
 */
export const isEqualCaseInsensitive = (str1: string, str2: string): boolean => {
  return str1.toLowerCase() === str2.toLowerCase();
};

export const formatJson = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (err) {
    console.warn("formatJson: failed to parse JSON", err);
    return value;
  }
};
