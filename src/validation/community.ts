import { z } from "zod";
import { imageUrlSchema } from "./imageUrl";

const optionalJsonSchema = z
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
    { message: "Must be valid JSON" },
  )
  .transform((val): Record<string, unknown> | undefined => {
    if (!val) return undefined;
    return JSON.parse(val) as Record<string, unknown>;
  })
  .optional();

export const communityValidationSchema = z.object({
  name: z
    .string()
    .min(1, "Community name is required")
    .max(100, "Community name must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  memberBadgeMetadata: optionalJsonSchema,
  memberBadgeImageUrl: imageUrlSchema,
  creatorBadgeImageUrl: imageUrlSchema,
  creatorBadgeMetadata: optionalJsonSchema,
});

export type CommunityInputData = z.input<typeof communityValidationSchema>;

export type CommunityTransformedData = z.output<
  typeof communityValidationSchema
>;
