"use client";

import { Box, Paper, Typography } from "@mui/material";
import { TransactionButton } from "../Transaction/TransactionButton";
import { AmountInput } from "../AmountInput/AmountInput";
import { useMemo } from "react";
import { scaleUp } from "@/utils/bigint";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { ContentGuard } from "../Bubbles/ContentGuard";
import { GasEstimation } from "../Transaction/GasEstimation";
import { SimulationError } from "../Transaction/SimulationError";

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

  const biddingTokenDecimals = useMemo(
    () => (decimalsBiddingToken ? Number(decimalsBiddingToken) : undefined),
    [decimalsBiddingToken],
  );

  const validationSchema = useMemo(() => {
    if (
      minBid === undefined ||
      biddingTokenDecimals === undefined ||
      minPrice === undefined
    ) {
      return undefined;
    }

    return buildBidValidationSchema({
      minBid,
      minPrice,
      biddingTokenDecimals,
    });
  }, [biddingTokenDecimals, minBid, minPrice]);

  const form = useForm<BidInput, unknown, BidOutput>({
    ...(validationSchema && { resolver: zodResolver(validationSchema) }),
    defaultValues: {
      sellAmount: undefined,
      price: undefined,
    },
    mode: "onTouched",
    disabled: validationSchema === undefined,
  });

  const values = useWatch({
    control: form.control,
  });

  const {
    approveRequired,
    mutate,
    isApproving,
    isMutating: isBidding,
    isSyncing,
    isLoading,
    isSuccess,
    approveReceipt,
    bidReceipt,
    simulation,
    gas,
    gasLoading,
    gasError,
  } = useBidMutation({
    ...values,
    onSuccess: () => {
      form.reset();
    },
    enabled: form.formState.isValid,
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
      isSyncing ||
      simulation.isLoading ||
      simulation.isError
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
    simulation.isLoading,
    simulation.isError,
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
    <ContentGuard
      requireNetwork
      connectWalletMessage="Connect your wallet to place a bid."
      switchNetworkMessage="Please switch to the correct network to place a bid."
      sx={{
        maxWidth: { xs: "100%", lg: 400 },
        width: { xs: "100%", lg: "auto" },
        height: "100%",
      }}
    >
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
            {minBid !== undefined && biddingTokenDecimals !== undefined ? (
              <FormattedNumber
                value={minBid}
                scaleDownDecimals={biddingTokenDecimals}
                maxDecimals={4}
                minThreshold={0.0001}
                suffix={symbolBiddingToken}
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
            {minPrice !== undefined && biddingTokenDecimals !== undefined ? (
              <FormattedNumber
                value={minPrice}
                scaleDownDecimals={biddingTokenDecimals}
                maxDecimals={4}
                minThreshold={0.0001}
                suffix={symbolBiddingToken}
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
              decimals={biddingTokenDecimals}
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
              decimals={biddingTokenDecimals}
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
              suffix="SPEC"
              variant="body2"
              color="textPrimary"
              fontWeight={700}
              component="span"
            />
          </Typography>
        )}

        {!isActionDisabled && (
          <GasEstimation
            value={gas}
            isLoading={gasLoading}
            isError={gasError}
          />
        )}

        <TransactionButton
          variant="contained"
          color="primary"
          fullWidth
          disabled={isActionDisabled}
          onClick={mutate}
          simulating={simulation.isFetching}
          loading={isLoading || isApproving || isBidding || isSyncing}
          loadingText={
            isSyncing
              ? "Syncing with subgraph..."
              : bidReceipt.isFetching
                ? "Confirming bid..."
                : approveReceipt.isFetching
                  ? "Confirming approval..."
                  : isApproving
                    ? "Approving..."
                    : isBidding
                      ? "Placing bid..."
                      : undefined
          }
        >
          {isSuccess
            ? "Bid Placed!"
            : approveRequired
              ? "Approve"
              : "Place Bid"}
        </TransactionButton>

        <SimulationError error={simulation.error} />

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
    </ContentGuard>
  );
};
