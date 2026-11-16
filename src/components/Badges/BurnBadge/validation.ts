import { addressValidationSchema } from "@/validation/address";
import z from "zod";
import { badgeAmountValidationSchema } from "../badgeAmount";

export const burnBadgeValidationSchema = z.object({
  holder: addressValidationSchema,
  amount: badgeAmountValidationSchema,
  confirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm this action",
  }),
});
