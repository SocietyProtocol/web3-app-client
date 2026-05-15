import { parseReferralCode } from "@/utils/referralCode";
import { bytesToHex, Hex, hexToBytes, isAddress, isHex } from "viem";
import z from "zod";

export const referralCodeValidationSchema = z
  .string()
  .refine(
    (value) => {
      const trimmed = value.trim();
      /**
       * Basic validation to check if the referral code is a valid hex string of the expected length (300 characters for 149 bytes). This ensures that the code has the correct format before attempting to parse it. The actual parsing will be done in the transform step, which will throw an error if the format is correct but the content is invalid (e.g., invalid address).
       */
      if (!isHex(trimmed) || trimmed.length !== 300) return false;

      const bytes = hexToBytes(trimmed);

      const address = bytes.slice(0, 20); // First 20 bytes for the address

      return isAddress(bytesToHex(address), {
        strict: false,
      });
    },
    {
      message: "Invalid referral code",
    },
  )
  .transform((value: string) => parseReferralCode(value.trim() as Hex));
