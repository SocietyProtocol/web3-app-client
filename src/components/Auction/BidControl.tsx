"use client";

import { Button, Paper } from "@mui/material";
import { AmountInput } from "../AmountInput/AmountInput";
import { useMemo, useState } from "react";

export const BidControl = () => {
  const [bid, setBid] = useState<bigint | undefined>(undefined);

  const price = BigInt(100);

  const specValue = useMemo(() => {
    if (bid === undefined) return undefined;

    return (bid * price * BigInt(10) ** BigInt(18)) / BigInt(10) ** BigInt(6);
  }, [bid, price]);

  return (
    <Paper
      elevation={0}
      sx={{
        padding: { xs: 2, sm: 3 },
        maxWidth: { xs: "100%", lg: 400 },
        width: { xs: "100%", lg: "auto" },
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
        decimals={6}
        value={bid}
        onChange={(value) => setBid(value)}
        max={BigInt(1002006000)} // Example max value
        fullWidth
      />

      <AmountInput
        label="USDC Per SPEC price"
        tokenSymbol="SPEC"
        decimals={18}
        value={specValue}
        fullWidth
        readonly
      />

      <Button variant="contained" color="primary" fullWidth disabled={!bid}>
        Place Bid
      </Button>
    </Paper>
  );
};
