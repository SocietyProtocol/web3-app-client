import { addressValidationSchema } from "@/validation/address";
import z from "zod";
import { isAddress } from "viem";

export const mintBadgeValidationSchema = z.object({
  recipients: z
    .array(addressValidationSchema)
    .min(1, "At least one recipient is required"),
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 2 * 1024 * 1024,
      "File must be less than 2MB",
    )
    .optional(),
  fileContent: z
    .string()
    .refine(
      (content) => {
        const addresses = content.split(",");

        return (
          addresses.length > 0 &&
          addresses.some((line) => isAddress(line.trim(), { strict: false }))
        );
      },
      {
        message: "File must contain valid addresses, separated by commas",
      },
    )
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const lines = value.split(",");
      const addresses = lines.map((line) => line.trim());

      return addresses.length > 0 ? addresses : undefined; // treat empty array as undefined
    }),
});
