import { parseReferralCode } from "@/utils/referralCode";
import { bytesToHex, Hex, hexToBytes, isAddress, isHex } from "viem";
import z from "zod";

export const referralCodeValidationSchema = z
  .string()
  .refine(
    (value) => {
      const trimmed = value.trim();
      if (!isHex(trimmed) || trimmed.length !== 172) return false;

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
