import { Address, isAddress } from "viem";
import { z } from "zod";

export const addressValidationSchema = z
  .string()
  .refine((value: string) => (isAddress(value) ? true : false), {
    message: "Invalid address",
  })
  .transform((value: string) => value.toLowerCase() as Address);
