import { Hex, isAddress } from "viem";
import { z } from "zod";

export const addressValidationSchema = z
  .string()
  .transform((value: string) => value.trim())
  .refine((value) => isAddress(value, { strict: false }), {
    message: "Invalid address",
  })
  .transform((value: string) => value.toLowerCase() as Hex);
