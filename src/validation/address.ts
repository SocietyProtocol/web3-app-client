import { isAddress } from "viem";
import { z } from "zod";

export const addressValidationSchema = z.string().refine(isAddress, {
  message: "Invalid address",
});
