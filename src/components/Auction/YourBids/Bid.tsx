"use client";

import { Box, Typography, Button, Skeleton, Tooltip } from "@mui/material";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";
import { Status } from "./Status";
import { Tr } from "./Tr";
import { Order } from "../../../../.graphclient";
import { FormattedNumber } from "@/components/FormattedNumber/FormattedNumber";
import { useCancelBidMutation } from "./useCancelBidMutation";
import { useAuctionContext } from "../AuctionContext";

export interface BidProps extends Partial<Order> {
  loading?: boolean;
  tokenSymbol?: string;
  status?: "Placed" | "Pending" | "Cancelled";
}

export const Bid = ({
  tokenSymbol,
  price,
  sellAmount,
  status,
  loading,
  id: orderId,
}: BidProps) => {
  const { isCancellationPastDeadline, refetch, refetchOrders, auctionDetail } =
    useAuctionContext();

  const { decimalsBiddingToken } = auctionDetail || {};

  const cancelBid = useCancelBidMutation({
    orderId,
    onSuccess: () => {
      refetch();
      refetchOrders();
    },
  });

  if (loading) {
    return (
      <Tr role="row">
        <Skeleton width="80%" height={24} />
        <Skeleton width="60%" height={24} />
        <Skeleton width="40%" height={24} />
        <Skeleton width={80} height={32} />
      </Tr>
    );
  }

  return (
    <Tr role="row">
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          sx={{
            display: { xs: "block", md: "none" },
            fontSize: "10px",
            fontWeight: 400,
            color: "text.secondary",
            textTransform: "uppercase",
            mb: 0.5,
          }}
        >
          Amount
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {tokenSymbol && <TokenIcon symbol={tokenSymbol} size={24} />}

          {tokenSymbol && sellAmount && decimalsBiddingToken && (
            <FormattedNumber
              value={BigInt(sellAmount)}
              symbol={tokenSymbol}
              scaleDownDecimals={Number(decimalsBiddingToken)}
              fontWeight={700}
              component="span"
            />
          )}
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: {
            xs: "center",
            md: "flex-start",
          },

          gap: { xs: 0.5, md: 0 },
        }}
      >
        <Typography
          sx={{
            display: { xs: "block", md: "none" },
            fontSize: "10px",
            fontWeight: 400,
            color: "text.secondary",
            textTransform: "uppercase",
          }}
        >
          Limit Price
        </Typography>
        {tokenSymbol && decimalsBiddingToken && (
          <Typography fontWeight={700} component="span">
            <FormattedNumber
              value={price}
              maxDecimals={Number(decimalsBiddingToken)}
              symbol={tokenSymbol}
              fontWeight={700}
              component="span"
            />{" "}
            per 1 {tokenSymbol}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          display: { xs: "flex", md: "block" },
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 0.5, md: 0 },
        }}
      >
        <Typography
          sx={{
            display: { xs: "block", md: "none" },
            fontSize: "10px",
            fontWeight: 400,
            color: "text.secondary",
            textTransform: "uppercase",
          }}
        >
          Status
        </Typography>
        {status && <Status status={status}>{status}</Status>}
      </Box>
      <Box
        sx={{
          display: { xs: "flex", md: "block" },
          gridColumn: { xs: "1", md: "auto" },
          justifyContent: "center",
        }}
      >
        {(status === "Placed" || status === "Pending") && (
          <Tooltip
            title={
              isCancellationPastDeadline ? "Cancellation period has ended" : ""
            }
            arrow
          >
            <span>
              <Button
                size="small"
                variant="contained"
                onClick={cancelBid.mutate}
                disabled={cancelBid.isLoading || isCancellationPastDeadline}
                sx={{
                  width: { xs: "100%", sm: "200px", md: "auto" },
                }}
              >
                {cancelBid.isMutating ? "Canceling..." : "Cancel"}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>
    </Tr>
  );
};
