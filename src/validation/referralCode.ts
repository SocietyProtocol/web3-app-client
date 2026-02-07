import { parseReferralCode } from "@/components/ProfileDataCard/utils";
import { bytesToHex, Hex, hexToBytes, isAddress, isHex } from "viem";
import z from "zod";

export const referralCodeValidationSchema = z
  .string()
  .refine(
    (value) => {
      if (!isHex(value) || value.length < 172) return false;

      const bytes = hexToBytes(value);

      const address = bytes.slice(0, 20); // First 21 characters for the address

      return isAddress(bytesToHex(address), {
        strict: true,
      });
    },
    {
      message: "Invalid referral code",
    },
  )
  .transform((value: string) => {
    return parseReferralCode(value as Hex);
  });
