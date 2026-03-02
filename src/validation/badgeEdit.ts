import z from "zod";
import { badgeValidationSchema } from "./badge";

export const badgeEditValidationSchema = badgeValidationSchema.pick({
  name: true,
  imageUrl: true,
  metadata: true,
  isOfficial: true,
  isCommunity: true,
});

export type BadgeEditInputData = z.input<typeof badgeEditValidationSchema>;

export type BadgeEditTransformedData = z.output<
  typeof badgeEditValidationSchema
>;
