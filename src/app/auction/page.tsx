import { CountDown } from "@/components/Auction/CountDown";
import { Box, Stack, Typography } from "@mui/material";
import { AuctionHeader } from "@/components/Auction/AuctionHeader";
import { mockAuctionStats } from "@/data/auction-stats";
import { AuctionStat } from "@/components/Auction/AuctionStat";
import { BidControl } from "@/components/Auction/BidControl";
import { HistoricalRate } from "@/components/Auction/Chart/HistoricalRate";
import { mockHistoricalRate } from "@/data/historical-rate";
import { YourBids } from "@/components/Auction/YourBids";

export default function AuctionPage() {
  return (
    <Box>
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
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 2, md: 1 }}
          alignItems="center"
          justifyContent="space-between"
        >
          {mockAuctionStats.slice(0, 2).map((stat) => (
            <AuctionStat
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              tooltip={stat.tooltip}
            />
          ))}

          <CountDown endTimestamp={1772323200} />

          {mockAuctionStats.slice(2).map((stat) => (
            <AuctionStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tooltip={stat.tooltip}
            />
          ))}
        </Stack>

        <Stack>
          <Typography variant="h6" gutterBottom color="primary.main">
            Place Bid
          </Typography>

          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="stretch"
            alignItems="stretch"
            flex={1}
          >
            <BidControl />
            <HistoricalRate series={mockHistoricalRate} />
          </Stack>
        </Stack>

        <YourBids />
      </Box>
    </Box>
  );
}
