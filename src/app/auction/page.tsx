import { Box, Typography, Chip } from "@mui/material";

export default function AuctionPage() {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          Auction
        </Typography>
        <Chip
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "white",
                }}
              />
              Active
            </Box>
          }
          size="small"
          sx={{
            height: 20,
            fontSize: "0.75rem",
            backgroundColor: "success.main",
            color: "white",
          }}
        />
      </Box>
      <Typography variant="body1">
        This is the auction page. Participate in active auctions and view
        auction history.
      </Typography>
    </Box>
  );
}
