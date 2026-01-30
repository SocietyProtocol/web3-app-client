import { formatUnits } from "viem";
import z from "zod";

interface BuildBidValidationSchemaParams {
  minBid: bigint;
  minPrice: bigint;
  biddingTokenDecimals: number;
}

export const buildBidValidationSchema = ({
  minBid,
  minPrice,
  biddingTokenDecimals,
}: BuildBidValidationSchemaParams) =>
  z.object({
    sellAmount: z
      .bigint()
      .gt(minBid, {
        message: `Bid amount must be greater than minimum bid of ${formatUnits(minBid, biddingTokenDecimals)}`,
      })
      .optional(),

    price: z
      .bigint()
      .gt(minPrice, {
        message: `Price must be greater than minimum price of ${formatUnits(minPrice, biddingTokenDecimals)}`,
      })
      .optional(),
  });

export type BidValidationSchema = ReturnType<typeof buildBidValidationSchema>;

export type BidInput = z.input<BidValidationSchema>;

export type BidOutput = z.output<BidValidationSchema>;
