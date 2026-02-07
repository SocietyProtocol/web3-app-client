import { Address, Hex, isAddress } from "viem";
import { z } from "zod";

export const addressValidationSchema = z
  .string()
  .refine((value) => isAddress(value, { strict: false }), {
    message: "Invalid address",
  })
  .transform((value: string) => value.toLowerCase() as Hex);

export const checksumAddressValidationSchema = z
  .string()
  .refine((value) => isAddress(value, { strict: true }), {
    message: "Invalid checksummed address",
  })
  .transform((value: string) => value as Address);
