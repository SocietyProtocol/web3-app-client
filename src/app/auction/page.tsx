import { AuctionStatus } from "@/components/Auction/AuctionStatus";
import { AuctionStatusEnum } from "@/components/Auction/types";
import { Box, Typography } from "@mui/material";

export default function AuctionPage() {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          Auction
        </Typography>

        <AuctionStatus status={AuctionStatusEnum.ACTIVE} size="medium" />
      </Box>
      <Typography variant="body1">
        This is the auction page. Participate in active auctions and view
        auction history.
      </Typography>
    </Box>
  );
}
