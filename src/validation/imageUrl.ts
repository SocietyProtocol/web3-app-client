import z from "zod";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const imageUrlSchema = z.custom<string | null>(
  (val) => {
    // Allow null values
    if (val === null) return true;

    if (typeof val !== "string") return false;

    // Allow empty string
    if (!val) return true;

    // Validate base64 data URL format
    const mimeMatch = val.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/i);

    if (!mimeMatch) return false;

    const fullMimeType = `image/${mimeMatch[1].toLowerCase()}`;

    // Check if image type is allowed
    if (!ALLOWED_IMAGE_TYPES.includes(fullMimeType)) return false;

    // Extract and validate base64 string size
    const base64String = mimeMatch[2];
    const paddingCount = (base64String.match(/=/g) || []).length;
    const sizeInBytes = (base64String.length * 3) / 4 - paddingCount;

    return sizeInBytes <= MAX_AVATAR_SIZE;
  },
  {
    message: `Image must be a valid JPEG, PNG, WebP, SVG, or GIF and not exceed ${MAX_AVATAR_SIZE / 1024 / 1024}MB`,
  },
);
