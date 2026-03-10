"use client";

import { Button } from "@mui/material";

export const StakeSpecButton = () => (
  <Button
    variant="contained"
    onClick={() => {
      // TODO: Replace with staking navigation when route is available
    }}
  >
    Stake SPEC →
  </Button>
);

export const TokenomicsButton = () => (
  <Button
    variant="outlined"
    onClick={() => {
      // TODO: Navigate to the Tokenomics page when available.
    }}
  >
    Tokenomics →
  </Button>
);
