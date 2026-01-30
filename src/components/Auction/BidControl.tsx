"use client";

import { Box, Button, Paper, Typography } from "@mui/material";
import { AmountInput } from "../AmountInput/AmountInput";
import { useCallback, useEffect, useMemo } from "react";
import { scaleUp } from "@/utils/bigint";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BidInput,
  BidOutput,
  buildBidValidationSchema,
} from "@/validation/bid";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, Hex } from "viem";
import { useBalanceOf } from "@/hooks/erc20/useBalanceOf";
import { EasyAuctionAbi } from "@/abis/EasyAuction";
import { getAuctionContractAddress } from "@/lib/wagmi";
import { useAllowance } from "@/hooks/erc20/useAllowance";
import { useAuctionContext } from "./AuctionContext";
import { TransactionFeedback } from "../Transaction/TransactionFeedback";
import { useWaitForSubgraphSync } from "@/hooks/useWaitForSubgraphSync";

export const BidControl = () => {
  const { address } = useAccount();

  const { auctionDetail, minBid, minPrice, refetch, refetchOrders } =
    useAuctionContext();

  const chainId = useChainId();

  const contractAddress = useMemo(
    () => getAuctionContractAddress(chainId),
    [chainId],
  );

  const {
    auctionId,
    addressBiddingToken,
    symbolBiddingToken,
    symbolAuctioningToken,
    decimalsBiddingToken,
    decimalsAuctioningToken,
  } = auctionDetail ?? {};

  const userBiddingTokenAllowance = useAllowance({
    ownerAddress: address,
    spenderAddress: contractAddress,
    tokenAddress: addressBiddingToken,
  });

  const userBiddingTokenBalance = useBalanceOf({
    address,
    tokenAddress: addressBiddingToken,
  });

  const { writeContractAsync, isPending, data } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({
    hash: data,
  });

  const { isSynced, isWaiting } = useWaitForSubgraphSync(
    receipt.data?.blockNumber,
  );

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
      bidAmount: undefined,
      price: undefined,
    },
    mode: "onTouched",
    disabled:
      validationSchema === undefined ||
      isPending ||
      receipt.isFetching ||
      isWaiting,
  });

  const values = form.watch();

  const approveRequired = useMemo(() => {
    if (
      values.bidAmount === undefined ||
      userBiddingTokenAllowance.data === undefined
    ) {
      return false;
    }

    return userBiddingTokenAllowance.data < values.bidAmount;
  }, [userBiddingTokenAllowance.data, values.bidAmount]);

  const amountSpecBigInt = useMemo(() => {
    if (
      decimalsAuctioningToken === undefined ||
      values.bidAmount === undefined ||
      values.price === undefined ||
      values.price === BigInt(0) ||
      values.bidAmount === BigInt(0)
    ) {
      return undefined;
    }

    return scaleUp(values.bidAmount, decimalsAuctioningToken) / values.price;
  }, [values, decimalsAuctioningToken]);

  const placeBid = useCallback(async () => {
    if (
      addressBiddingToken === undefined ||
      values.bidAmount === undefined ||
      userBiddingTokenAllowance.data === undefined
    ) {
      return;
    }

    if (userBiddingTokenAllowance.data < values.bidAmount) {
      await writeContractAsync({
        address: addressBiddingToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress, values.bidAmount],
      });
      return;
    }

    if (auctionId === undefined || amountSpecBigInt === undefined) {
      return;
    }

    await writeContractAsync({
      address: contractAddress,
      abi: EasyAuctionAbi,
      functionName: "placeSellOrders",
      args: [
        BigInt(auctionId),
        [amountSpecBigInt],
        [values.bidAmount],
        [
          "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
        ],
        "0x" as Hex,
      ],
    });
  }, [
    addressBiddingToken,
    values.bidAmount,
    userBiddingTokenAllowance.data,
    auctionId,
    amountSpecBigInt,
    writeContractAsync,
    contractAddress,
  ]);

  useEffect(() => {
    if (isSynced) {
      form.reset();
      refetch();
      refetchOrders();
    }
  }, [form, isSynced, refetch, refetchOrders]);

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
        name="bidAmount"
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
            disabled={form.formState.disabled}
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
            disabled={form.formState.disabled}
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
        disabled={!form.formState.isValid || form.formState.disabled}
        onClick={placeBid}
      >
        {isWaiting
          ? "Syncing..."
          : receipt.isFetching
            ? "Waiting for confirmation..."
            : isPending
              ? "Processing..."
              : approveRequired
                ? "Approve"
                : "Place Bid"}
      </Button>

      <TransactionFeedback
        hash={receipt.data?.transactionHash}
        status={receipt.data?.status}
        successMessage="Bid placed successfully!"
      />
    </Paper>
  );
};
