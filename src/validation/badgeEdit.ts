import { z } from "zod";
import { imageUrlSchema } from "./imageUrl";

export const badgeEditValidationSchema = z.object({
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
});

export type BadgeEditInputData = z.input<typeof badgeEditValidationSchema>;

export type BadgeEditTransformedData = z.output<
  typeof badgeEditValidationSchema
>;
