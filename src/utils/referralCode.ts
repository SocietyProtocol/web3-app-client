import { bytesToHex, concatHex, Hex, hexToBytes } from "viem";

/**
 * Generates a referral message that the user needs to sign in order to create a referral code.
 *
 * @param address The address for which the referral code is being generated.
 * @returns The referral message to be signed.
 */
export function generateReferralMessage(address: Hex): string {
  return `Sign this message to generate a referral code for the address: ${address.toLowerCase()}`;
}

/**
 * Generates a referral code by concatenating the lowercased address and signature.
 *
 * @param signature The signature obtained from signing the referral message.
 * @param address The address for which the referral code is being generated.
 * @returns The generated referral code as a Hex string.
 */
export const generateReferralCode = (signature: Hex, address: Hex): Hex => {
  return concatHex([
    address.toLowerCase() as Hex,
    signature.toLowerCase() as Hex,
  ]);
};

/**
 * Parses a referral code to extract the address and signature.
 *
 * @param referralCode The referral code to be parsed.
 * @returns An object containing the extracted address and signature as Hex strings.
 */
export const parseReferralCode = (
  referralCode: Hex,
): { inviter: Hex; signature: Hex } => {
  const bytes = hexToBytes(referralCode);

  const address = bytes.slice(0, 20); // First 20 bytes for the address
  const signature = bytes.slice(20); // Remaining bytes for the signature

  return {
    inviter: bytesToHex(address).toLowerCase() as Hex,
    signature: bytesToHex(signature).toLowerCase() as Hex,
  };
};
