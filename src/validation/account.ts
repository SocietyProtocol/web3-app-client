import { z } from "zod";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const accountValidationSchema = z.object({
  name: z.string().max(100, "Name must be 100 characters or less").optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  avatar: z
    .string()
    .nullable()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        return value.startsWith("data:image/");
      },
      { message: "Avatar must be a valid image" }
    )
    .refine(
      (value) => {
        if (!value) return true;
        const mimeMatch = value.match(
          /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/i
        );
        if (!mimeMatch) return false;
        const fullMimeType = `image/${mimeMatch[1]}`;
        return ALLOWED_IMAGE_TYPES.includes(fullMimeType);
      },
      { message: "Avatar must be a JPEG, PNG, WebP, SVG, or GIF image" }
    )
    .refine(
      (value) => {
        if (!value) return true;
        const base64Match = value.match(/^data:image\/[a-z+]+;base64,(.+)$/);
        if (!base64Match) return false;
        const base64String = base64Match[1];
        const paddingCount = (base64String.match(/=/g) || []).length;
        const sizeInBytes = (base64String.length * 3) / 4 - paddingCount;
        return sizeInBytes <= MAX_AVATAR_SIZE;
      },
      {
        message: `Avatar size must not exceed ${
          MAX_AVATAR_SIZE / 1024 / 1024
        }MB`,
      }
    ),
  referralCode: z
    .string()
    .max(50, "Referral code must be 50 characters or less")
    .optional(),
});

export type AccountData = z.infer<typeof accountValidationSchema>;
