"use client";

import { Box, Button, Paper, Typography } from "@mui/material";
import { AmountInput } from "../AmountInput/AmountInput";
import { useMemo } from "react";
import { scaleUp } from "@/utils/bigint";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BidInput,
  BidOutput,
  buildBidValidationSchema,
} from "@/validation/bid";
import { useAccount } from "wagmi";
import { useBalanceOf } from "@/hooks/erc20/useBalanceOf";
import { useAuctionContext } from "./AuctionContext";
import { TransactionFeedback } from "../Transaction/TransactionFeedback";
import { useBidMutation } from "./useBidMutation";

export const BidControl = () => {
  const { address } = useAccount();

  const { auctionDetail, minBid, minPrice } = useAuctionContext();

  const {
    addressBiddingToken,
    symbolBiddingToken,
    symbolAuctioningToken,
    decimalsBiddingToken,
    decimalsAuctioningToken,
  } = auctionDetail ?? {};

  const userBiddingTokenBalance = useBalanceOf({
    address,
    tokenAddress: addressBiddingToken,
  });

  const validationSchema = useMemo(() => {
    const biddingTokenDecimals = decimalsBiddingToken
      ? Number(decimalsBiddingToken)
      : undefined;

    if (minBid === undefined || biddingTokenDecimals === undefined) {
      return undefined;
    }

    return buildBidValidationSchema({
      minBid: BigInt(minBid),
      minPrice: minPrice ? BigInt(minPrice) : BigInt(0),
      biddingTokenDecimals,
    });
  }, [decimalsBiddingToken, minBid, minPrice]);

  const form = useForm<BidInput, unknown, BidOutput>({
    ...(validationSchema && { resolver: zodResolver(validationSchema) }),
    defaultValues: {
      sellAmount: undefined,
      price: undefined,
    },
    mode: "onTouched",
    disabled: validationSchema === undefined,
  });

  const values = form.watch();

  const {
    approveRequired,
    mutate,
    isApproving,
    isBidding,
    isSyncing,
    isLoading,
    isSuccess,
    approveReceipt,
    bidReceipt,
  } = useBidMutation({
    ...values,
    onSuccess: () => {
      userBiddingTokenBalance.refetch();
      form.reset();
    },
  });

  const isActionDisabled = useMemo(() => {
    return (
      !form.formState.isValid ||
      form.formState.disabled ||
      !values.sellAmount ||
      !values.price ||
      isLoading ||
      isApproving ||
      isBidding ||
      isSyncing
    );
  }, [
    form.formState.isValid,
    form.formState.disabled,
    values.sellAmount,
    values.price,
    isLoading,
    isApproving,
    isBidding,
    isSyncing,
  ]);

  const amountSpecBigInt = useMemo(() => {
    if (
      decimalsAuctioningToken === undefined ||
      values.sellAmount === undefined ||
      values.price === undefined ||
      values.price === BigInt(0) ||
      values.sellAmount === BigInt(0)
    ) {
      return undefined;
    }

    return scaleUp(values.sellAmount, decimalsAuctioningToken) / values.price;
  }, [values, decimalsAuctioningToken]);

  return (
    <Paper
      elevation={0}
      sx={{
        padding: { xs: 2, sm: 3 },
        maxWidth: { xs: "100%", lg: 400 },
        width: { xs: "100%", lg: "auto" },
        minWidth: {
          xs: "100%",
          sm: 400,
        },
        backgroundColor: "transparent",
        border: (theme) => `1px solid ${theme.palette.border.area}`,
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Box>
        <Typography variant="body2" color="textPrimary" component="div">
          Minimum bid amount:{" "}
          {minBid !== undefined && decimalsBiddingToken !== undefined ? (
            <FormattedNumber
              value={BigInt(minBid)}
              scaleDownDecimals={decimalsBiddingToken}
              maxDecimals={4}
              minThreshold={0.0001}
              symbol={symbolBiddingToken}
              variant="body2"
              color="textPrimary"
              component="span"
              fontWeight={700}
            />
          ) : (
            "N/A"
          )}
        </Typography>
        <Typography variant="body2" color="textPrimary" component="div">
          Minimum price:{" "}
          {minPrice !== undefined && decimalsBiddingToken !== undefined ? (
            <FormattedNumber
              value={BigInt(minPrice)}
              scaleDownDecimals={decimalsBiddingToken}
              maxDecimals={4}
              minThreshold={0.0001}
              symbol={symbolBiddingToken}
              variant="body2"
              color="textPrimary"
              component="span"
              fontWeight={700}
            />
          ) : (
            "N/A"
          )}
        </Typography>
      </Box>
      <Controller
        name="sellAmount"
        control={form.control}
        render={({ field, fieldState }) => (
          <AmountInput
            label="Amount"
            tokenSymbol={symbolBiddingToken}
            decimals={decimalsBiddingToken}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            max={userBiddingTokenBalance.data}
            error={fieldState.invalid}
            helperText={fieldState.error?.message}
            disabled={form.formState.disabled || isLoading}
            fullWidth
          />
        )}
      />

      <Controller
        name="price"
        control={form.control}
        render={({ field, fieldState }) => (
          <AmountInput
            label={`${symbolBiddingToken} Per ${symbolAuctioningToken} price`}
            tokenSymbol={symbolBiddingToken}
            decimals={decimalsBiddingToken}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.invalid}
            helperText={fieldState.error?.message}
            disabled={form.formState.disabled || isLoading}
            fullWidth
          />
        )}
      />

      {form.formState.isValid && amountSpecBigInt !== undefined && (
        <Typography variant="body2" color="textPrimary">
          You will receive approximately{" "}
          <FormattedNumber
            value={amountSpecBigInt}
            scaleDownDecimals={decimalsAuctioningToken}
            maxDecimals={4}
            minThreshold={0.0001}
            symbol="SPEC"
            variant="body2"
            color="textPrimary"
            fontWeight={700}
            component="span"
          />
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        fullWidth
        disabled={isActionDisabled}
        onClick={mutate}
      >
        {isSyncing
          ? "Syncing with subgraph..."
          : bidReceipt.isFetching
            ? "Confirming bid..."
            : approveReceipt.isFetching
              ? "Confirming approval..."
              : isApproving
                ? "Approving..."
                : isBidding
                  ? "Placing bid..."
                  : isSuccess
                    ? "Bid Placed!"
                    : approveRequired
                      ? "Approve"
                      : "Place Bid"}
      </Button>

      {approveReceipt.data && !bidReceipt.data && (
        <TransactionFeedback
          hash={approveReceipt.data?.transactionHash}
          status={approveReceipt.data?.status}
          successMessage="Approval confirmed"
        />
      )}

      {bidReceipt.data && (
        <TransactionFeedback
          hash={bidReceipt.data?.transactionHash}
          status={bidReceipt.data?.status}
          successMessage="Bid placed successfully!"
        />
      )}
    </Paper>
  );
};
