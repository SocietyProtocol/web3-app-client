import { addressValidationSchema } from "@/validation/address";
import z from "zod";
import { badgeAmountValidationSchema } from "../badgeAmount";

export const transferBadgeValidationSchema = z
  .object({
    from: addressValidationSchema,
    to: addressValidationSchema,
    amount: badgeAmountValidationSchema,
  })
  .refine(
    (data) => {
      const from = data.from.toLowerCase();
      const to = data.to.toLowerCase();
      return from !== to;
    },
    {
      message: "From and To addresses must be different",
      path: ["to"],
    },
  );
