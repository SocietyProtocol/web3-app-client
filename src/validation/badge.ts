import { z } from "zod";
import { imageUrlSchema } from "./imageUrl";
import { addressValidationSchema } from "./address";
import { bigNumericStringSchema } from "./bigNumeric";

export const badgeValidationSchema = z.object({
  name: z
    .string()
    .min(1, "Badge name is required")
    .max(100, "Badge name must be less than 100 characters"),
  imageUrl: imageUrlSchema,
  metadata: z
    .string()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Metadata must be valid JSON" },
    )
    .optional(),
  isOfficial: z.boolean(),
  isCommunity: z.boolean(),
  minters: z.array(bigNumericStringSchema), // Badge IDs
  transferers: z.array(bigNumericStringSchema), // Badge IDs
  burners: z.array(bigNumericStringSchema), // Badge IDs
  editors: z.array(addressValidationSchema), // Ethereum addresses
});

export type BadgeInputData = z.input<typeof badgeValidationSchema>;

export type BadgeTransformedData = z.output<typeof badgeValidationSchema>;
