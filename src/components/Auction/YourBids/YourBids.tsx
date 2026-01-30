"use client";

import { Box, Paper, Typography } from "@mui/material";
import { HeaderCell } from "./HeaderCell";
import { Tr } from "./Tr";
import { useAuctionContext } from "../AuctionContext";
import { Bid } from "./Bid";
import { useMemo } from "react";

export const YourBids = () => {
  const { orders, isOrdersLoading, auctionDetail } = useAuctionContext();
  const exactOrder = auctionDetail?.exactOrder;

  const sortedOrders = useMemo(() => {
    return orders
      ?.filter((order) => order.id !== exactOrder?.id)
      .sort((a, b) => {
        return Number(b.timestamp) - Number(a.timestamp);
      });
  }, [orders, exactOrder]);

  console.log({
    sortedOrders,
  });

  return (
    <Paper
      elevation={0}
      sx={{
        padding: {
          xs: 0,
          md: "24px 40px",
          lg: "24px 80px",
        },
        backgroundColor: "transparent",
        border: (theme) => `1px solid ${theme.palette.border.area}`,
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        position: "relative",
        overflowX: "auto",
      }}
    >
      {isOrdersLoading ? (
        <>
          {Array.from({ length: 3 }).map((_, index) => (
            <Bid key={index} loading />
          ))}
        </>
      ) : sortedOrders?.length === 0 ? (
        <Typography
          sx={{
            padding: (theme) => ({
              xs: theme.spacing(4, 0),
              md: theme.spacing(10, 0),
            }),
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          No bids found.
        </Typography>
      ) : (
        <>
          <Tr
            sx={{
              display: { xs: "none", md: "grid" },
            }}
          >
            <HeaderCell
              label="Amount"
              tooltip="The amount of tokens in your bid"
            />
            <HeaderCell
              label="Limit Price"
              tooltip="The maximum price per token"
            />
            <HeaderCell label="Status" tooltip="Current status of your bid" />
            <Box />
          </Tr>
          {sortedOrders?.map((bid) => (
            <Bid
              key={bid.id}
              buyAmount={bid.buyAmount}
              sellAmount={bid.sellAmount}
              price={bid.price}
              tokenSymbol="USDC"
              status="Placed"
            />
          ))}
        </>
      )}
    </Paper>
  );
};
