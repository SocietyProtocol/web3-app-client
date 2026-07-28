import {
  bytesToHex,
  concatHex,
  Hex,
  hexToBytes,
  hexToBigInt,
  numberToHex,
} from "viem";

/**
 * Generates a referral code by encoding the inviter, nonce, expiry, and signature.
 *
 * Layout (149 bytes): inviter (20) | nonce (32) | expiry (32) | signature (65) which translates to 40 + 64 + 64 + 130 = 298 hex characters (plus '0x' prefix makes it 300).
 *
 *
 * The invitee is not stored — only the person the code was signed for can use it.
 *
 * @param signature The EIP-712 signature from the inviter.
 * @param inviter The inviter address.
 * @param nonce The unique nonce used in the signed data.
 * @param expiry The Unix timestamp expiry used in the signed data.
 * @returns The generated referral code as a Hex string.
 */
export const generateReferralCode = (
  signature: Hex,
  inviter: Hex,
  nonce: bigint,
  expiry: bigint,
): Hex => {
  return concatHex([
    inviter.toLowerCase() as Hex,
    numberToHex(nonce, { size: 32 }),
    numberToHex(expiry, { size: 32 }),
    signature.toLowerCase() as Hex,
  ]);
};

/**
 * Parses a referral code to extract the inviter, nonce, expiry, and signature.
 *
 * @param referralCode The referral code to be parsed.
 * @returns An object containing inviter, nonce, expiry, and signature.
 */
export const parseReferralCode = (
  referralCode: Hex,
): { inviter: Hex; nonce: bigint; expiry: bigint; signature: Hex } => {
  const bytes = hexToBytes(referralCode);

  return {
    inviter: bytesToHex(bytes.slice(0, 20)).toLowerCase() as Hex,
    nonce: hexToBigInt(bytesToHex(bytes.slice(20, 52))),
    expiry: hexToBigInt(bytesToHex(bytes.slice(52, 84))),
    signature: bytesToHex(bytes.slice(84)).toLowerCase() as Hex,
  };
};
