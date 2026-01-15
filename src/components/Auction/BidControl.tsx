"use client";

import { Button, Paper, Typography } from "@mui/material";
import { AmountInput } from "../AmountInput/AmountInput";
import { useMemo, useState } from "react";
import { scaleUp } from "@/utils/bigint";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";

export const BidControl = () => {
  const [bid, setBid] = useState<bigint | undefined>(undefined);
  const [price, setPrice] = useState<bigint | undefined>(undefined);

  const usdcDecimals = 6;
  const specDecimals = 18;

  const amountSpecBigInt = useMemo(() => {
    if (bid === undefined || price === undefined || price === BigInt(0)) {
      return undefined;
    }

    return scaleUp(bid, specDecimals) / price;
  }, [bid, price]);

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
      <AmountInput
        label="Amount"
        tokenSymbol="USDC"
        decimals={usdcDecimals}
        value={bid}
        onChange={(value) => setBid(value)}
        max={BigInt(1002006000)} // Example max value
        fullWidth
      />

      <AmountInput
        label="USDC Per SPEC price"
        tokenSymbol="USDC"
        decimals={usdcDecimals}
        value={price}
        onChange={(value) => setPrice(value)}
        fullWidth
      />

      {amountSpecBigInt !== undefined && (
        <Typography variant="body2" color="textPrimary">
          You will receive approximately{" "}
          <FormattedNumber
            value={amountSpecBigInt}
            scaleDownDecimals={specDecimals}
            minDecimals={2}
            maxDecimals={4}
            minThreshold={0.0001}
            symbol="SPEC"
            variant="body2"
            color="textPrimary"
            component="span"
          />
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        fullWidth
        disabled={bid === undefined || price === undefined}
      >
        Place Bid
      </Button>
    </Paper>
  );
};
