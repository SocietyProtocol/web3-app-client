"use client";

import { Stack, Typography } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";

export interface AuctionHeaderProps {
  networkName?: string;
  id?: number;
  active?: boolean;
}

export const AuctionHeader = ({
  networkName,
  id,
  active = false,
}: AuctionHeaderProps) => {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={{ xs: 2, md: 1 }}
      alignItems={{ xs: "flex-start", md: "center" }}
      justifyContent="space-between"
      width="100%"
    >
      <Stack direction="row" spacing={{ xs: 2, sm: 3 }} alignItems="center">
        <TokenIcon symbol="spec" size={54} />

        <Stack spacing={1}>
          <Typography
            variant="h4"
            component="h1"
            color="primary.main"
            sx={{ fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" } }}
          >
            SPEC Token Auction
          </Typography>
          {active && (
            <Typography
              variant="subtitle1"
              color="primary.main"
              component="div"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              <LanguageIcon fontSize="small" />
              {networkName} - Auction id #{id}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
};
