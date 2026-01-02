import { z } from "zod";

export interface AccountData {
  name: string;
  bio?: string;
  avatar?: string | null;
  referralCode?: string;
  cid?: string;
}

export const accountValidationSchema = z.object({
  name: z.string().max(100, "Name must be 100 characters or less"),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  avatar: z.string().nullable().optional(),
  referralCode: z
    .string()
    .max(50, "Referral code must be 50 characters or less")
    .optional(),
  cid: z.string().optional(),
});
