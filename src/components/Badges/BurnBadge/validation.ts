import { addressValidationSchema } from "@/validation/address";
import z from "zod";

export const burnBadgeValidationSchema = z.object({
  holder: addressValidationSchema,
  confirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm this action",
  }),
});
