"use client";

import { Button, Stack, Typography } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import Image from "next/image";

export interface AuctionHeaderProps {
  networkName: string;
  id: number;
}

export const AuctionHeader = ({ networkName, id }: AuctionHeaderProps) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      width="100%"
    >
      <Stack direction="row" spacing={3} alignItems="center">
        <Image
          src="/tokens/spec.svg"
          alt="SPEC Token Logo"
          width={54}
          height={54}
        />

        <Stack spacing={1}>
          <Typography variant="h4" component="h1" color="primary.main">
            SPEC Token Auction
          </Typography>
          <Typography
            variant="subtitle1"
            color="primary.main"
            component="div"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <LanguageIcon fontSize="small" />
            {networkName} - Auction id #{id}
          </Typography>
        </Stack>
      </Stack>

      <Button variant="outlined">SPEC TOKENOMICS (PDF)</Button>
    </Stack>
  );
};
