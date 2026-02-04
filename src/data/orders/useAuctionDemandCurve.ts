import { useMemo } from "react";
import { Order } from "../../../.graphclient";
import { formatUnits } from "viem";

const EPSILON = 1e-12;

export const useAuctionDemandCurve = (
  orders?: Pick<Order, "price" | "buyAmount">[] | null,
  auctionTokenDecimals?: number,
) => {
  return useMemo(() => {
    if (auctionTokenDecimals === undefined || !orders || orders.length === 0) {
      return [];
    }

    const priceMap = new Map<number, bigint>();

    orders.forEach((order) => {
      const price = order.price;

      if (price !== undefined) {
        const priceNum = Number(price);
        const amountNum = BigInt(order.buyAmount);

        priceMap.set(
          priceNum,
          (priceMap.get(priceNum) ?? BigInt(0)) + amountNum,
        );
      }
    });

    const sortedPrices = Array.from(priceMap.keys()).sort((a, b) => b - a);

    let cumulative = BigInt(0);
    let prevPrice: number | null = null;

    const points = [];

    for (const price of sortedPrices) {
      const volume = priceMap.get(price)!;

      if (prevPrice !== null) {
        points.push({
          label: price + EPSILON,
          value: Number(formatUnits(cumulative, auctionTokenDecimals)),
        });
      }

      cumulative += volume;

      points.push({
        label: price,
        value: Number(formatUnits(cumulative, auctionTokenDecimals)),
      });

      prevPrice = price;
    }

    return points;
  }, [auctionTokenDecimals, orders]);
};
