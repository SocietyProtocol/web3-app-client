"use client";

import { Paper, Stack, Typography } from "@mui/material";
import { AmountInput } from "../AmountInput/AmountInput";
import { useState } from "react";

export const BidControl = () => {
  const [bid, setBid] = useState<bigint | undefined>(undefined);

  return (
    <Stack>
      <Typography variant="h6" gutterBottom>
        Place Bid
      </Typography>
      <Paper
        elevation={0}
        sx={{
          padding: (theme) => theme.spacing(3, 2),
          maxWidth: 400,
          backgroundColor: "transparent",
          border: (theme) => `1px solid ${theme.palette.border.area}`,
          borderRadius: "12px",
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
      </Paper>
    </Stack>
  );
};
