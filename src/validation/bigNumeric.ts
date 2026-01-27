import z from "zod";

export const bigNumericStringSchema = z
  .string()
  .refine(
    (val) => {
      try {
        // Check if the string can be converted to a BigInt
        BigInt(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Value must be a valid big numeric string" },
  )
  .transform((val) => BigInt(val));
