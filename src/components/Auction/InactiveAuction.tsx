"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { AuctionHeader } from "./AuctionHeader";
import { CountDown } from "./CountDown";
import Image from "next/image";

const formatAuctionDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);

  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Europe/Paris", // CET timezone
  };

  const dateStr = date.toLocaleDateString("en-US", options);

  // Get the hour in CET timezone
  const hour = parseInt(
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Paris",
    })
  );

  let timeStr = "";
  if (hour === 0) {
    timeStr = "at midnight CET";
  } else if (hour === 12) {
    timeStr = "at noon CET";
  } else if (hour < 12) {
    timeStr = `at ${hour} AM CET`;
  } else {
    timeStr = `at ${hour - 12} PM CET`;
  }

  return `${dateStr}, ${timeStr}`;
};

const StyledList = styled("ol")(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  marginTop: theme.spacing(2),
  color: theme.palette.primary.main,
  "& li": {
    marginBottom: theme.spacing(1),
  },
}));

export const InactiveAuction = () => {
  const startTimestamp = 1772323200;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: { xs: 3, sm: 4, md: 6 },
      }}
    >
      <AuctionHeader networkName="Mainnet" id={1} />

      <Stack
        direction="row"
        spacing={{ xs: 2, md: 1 }}
        alignItems="center"
        justifyContent="center"
      >
        <CountDown
          endTimestamp={startTimestamp}
          title={`The auction kicks off on ${formatAuctionDate(
            startTimestamp
          )}!`}
        />
      </Stack>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 3, sm: 4, lg: 2 }}
        sx={{
          padding: { xs: 2, sm: 3, md: "24px 40px", lg: "24px 96px" },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Box mb={{ xs: 4, md: 6 }}>
            <Typography
              variant="h6"
              color="primary.main"
              sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }}
            >
              SPEC Tonken fundamentals
            </Typography>
            <Typography
              sx={{ marginTop: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}
            >
              Build your own society with modular governance, automated trust,
              and sybil-resistant identities. The protocol works like a civic
              operating system: communities, currencies, laws, and
              membership—defined in code.
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="h6"
              color="primary.main"
              sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }}
            >
              Tokenomics & governance
            </Typography>
            <StyledList>
              <li>
                Fairness: Each participant in society should retain status /
                value equal to their contribution to society, at each point in
                time.
              </li>
              <li>
                Alignment: There are two inherently competing interests which
                must both be balanced and aligned: the individual desire and the
                societal interest. The goal of alignment is to make it such that
                each individuals optimal game theoretic move is the same as the
                optimal move for the society as a whole.
              </li>
              <li>
                Agency: We believe that agency and decentralization of control
                enables more potential actions for every individual, increasing
                human potential.
              </li>
            </StyledList>
          </Box>
        </Box>

        <Box sx={{ width: { xs: "100%", lg: "auto" } }}>
          <Card
            variant="bubble"
            sx={{
              backgroundColor: "transparent",
              minWidth: { xs: "100%", sm: 330 },
              maxWidth: { xs: "100%", lg: 400 },
            }}
          >
            <CardHeader
              title={
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  sx={{
                    mb: { xs: 3, sm: 5.5 },
                  }}
                >
                  <Image
                    src="/logo/logo-icon-dark.svg"
                    alt="Society Protocol Logo"
                    width={32}
                    height={32}
                    priority
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </Stack>
              }
            />
            <CardContent>
              <Typography
                variant="h5"
                color="primary.main"
                mb={{ xs: 3, sm: 6 }}
                sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
              >
                Tokenomics
              </Typography>
              <Button
                variant="contained"
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                SPEC Tokenomics (.PDF)
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};
