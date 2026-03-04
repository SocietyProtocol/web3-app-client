"use client";

import { Box, Typography, Skeleton, Tooltip, Stack } from "@mui/material";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";
import { Status } from "./Status";
import { Tr } from "./Tr";
import { Order } from "../../../../.graphclient";
import { FormattedNumber } from "@/components/FormattedNumber/FormattedNumber";
import { useCancelBidMutation } from "./useCancelBidMutation";
import { useAuctionContext } from "../AuctionContext";
import { SimulationError } from "@/components/Transaction/SimulationError";
import { parseErrorMessage } from "@/utils/errors";
import { useCallback } from "react";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";

export interface BidProps extends Partial<Order> {
  loading?: boolean;
  biddingTokenSymbol?: string;
  auctioningTokenSymbol?: string;
  status?: "Placed" | "Pending" | "Cancelled";
}

export const Bid = ({
  biddingTokenSymbol,
  auctioningTokenSymbol,
  price,
  sellAmount,
  status,
  loading,
  id: orderId,
}: BidProps) => {
  const { isCancellationPastDeadline, auctionDetail } = useAuctionContext();
  const { isWrongNetwork } = useCheckWrongNetwork();

  const { decimalsBiddingToken } = auctionDetail || {};

  const { simulation, execute, isLoading, gas, gasError, gasLoading } =
    useCancelBidMutation({
      orderId,
    });

  const handleCancelClick = useCallback(() => execute(), [execute]);

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
          {biddingTokenSymbol && (
            <TokenIcon symbol={biddingTokenSymbol} size={24} />
          )}

          {biddingTokenSymbol && sellAmount && decimalsBiddingToken && (
            <FormattedNumber
              value={BigInt(sellAmount)}
              suffix={biddingTokenSymbol}
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
        {biddingTokenSymbol &&
          auctioningTokenSymbol &&
          decimalsBiddingToken && (
            <Typography fontWeight={700} component="span">
              <FormattedNumber
                value={price}
                maxDecimals={Number(decimalsBiddingToken)}
                suffix={biddingTokenSymbol}
                fontWeight={700}
                component="span"
              />{" "}
              per 1 {auctioningTokenSymbol}
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
          <Stack spacing={1} sx={{ width: "100%", alignItems: "center" }}>
            <SimulationError error={simulation.error} />

            <Tooltip
              title={
                isWrongNetwork
                  ? "Switch to the correct network to cancel your bid"
                  : isCancellationPastDeadline
                    ? "Cancellation period has ended"
                    : simulation.error
                      ? parseErrorMessage(simulation.error)
                      : "Canceling a bid will remove it from the order book and return your funds, but it may take some time to process. If the cancellation period has ended, you may not be able to cancel your bid."
              }
              arrow
            >
              <span>
                <TransactionButton
                  size="small"
                  variant="contained"
                  onClick={handleCancelClick}
                  disabled={
                    isWrongNetwork ||
                    isCancellationPastDeadline ||
                    simulation?.isFetching ||
                    simulation?.isError
                  }
                  simulating={simulation?.isFetching}
                  loading={isLoading}
                  loadingText="Canceling..."
                  gas={gas}
                  gasLoading={gasLoading}
                  gasError={gasError}
                  sx={{
                    width: { xs: "100%", sm: "200px", md: "auto" },
                  }}
                >
                  Cancel
                </TransactionButton>
              </span>
            </Tooltip>
          </Stack>
        )}
      </Box>
    </Tr>
  );
};
