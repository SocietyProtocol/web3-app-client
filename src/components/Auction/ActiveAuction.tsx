import { CountDown } from "@/components/Auction/CountDown";
import { Box, Stack, Typography } from "@mui/material";
import { AuctionHeader } from "@/components/Auction/AuctionHeader";
import { AuctionStat } from "@/components/Auction/AuctionStat";
import { BidControl } from "@/components/Auction/BidControl";
import { PriceVolumeChart } from "@/components/Auction/PriceVolumeChart";
import { YourBids } from "@/components/Auction/YourBids/YourBids";
import { useChain } from "@/hooks/useChain";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { useAuctionContext } from "./AuctionContext";
import { useMemo } from "react";

export const ActiveAuction = () => {
  const {
    auctionDetail,
    minPrice,
    totalAuctioned,
    isLoading,
    priceVolumeHistogram,
  } = useAuctionContext();

  const {
    chainId,
    currentClearingPrice,
    symbolBiddingToken,
    decimalsBiddingToken,
    decimalsAuctioningToken,
    symbolAuctioningToken,
    endTimeTimestamp,
  } = auctionDetail ?? {};

  const xReferenceLines = useMemo(() => {
    if (currentClearingPrice === undefined) return [];

    return [
      {
        value: parseFloat(currentClearingPrice),
        label: "Current Clearing Price",
      },
    ];
  }, [currentClearingPrice]);

  const chain = useChain(chainId ? Number(chainId) : undefined);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: { xs: 3, sm: 4, md: 6 },
      }}
    >
      <AuctionHeader
        networkName={chain ? chain.name : "Unknown Network"}
        id={1}
        active={!isLoading}
      />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 1 }}
        alignItems="center"
        justifyContent="space-between"
      >
        <AuctionStat
          label="Current Clearing Price"
          value={
            <FormattedNumber
              value={Number(currentClearingPrice)}
              maxDecimals={4}
              minThreshold={0.0001}
              symbol={`${symbolBiddingToken}/${symbolAuctioningToken}`}
              component="div"
              color="primary.main"
              sx={{
                fontSize: 18,
                fontWeight: 700,
              }}
            />
          }
          tooltip="The current price at which the auction is clearing."
          loading={isLoading}
        />

        <AuctionStat
          icon="/tokens/spec.svg"
          label="Bidding With"
          value={symbolBiddingToken}
          tooltip="The token used for bidding in the auction."
          loading={isLoading}
        />

        <CountDown endTimestamp={endTimeTimestamp ?? 0} title="ENDS IN" />

        <AuctionStat
          label="Total Auctioned"
          value={
            <FormattedNumber
              value={totalAuctioned}
              scaleDownDecimals={decimalsAuctioningToken}
              maxDecimals={4}
              minThreshold={0.0001}
              symbol={symbolAuctioningToken}
              component="div"
              color="primary.main"
              sx={{
                fontSize: 18,
                fontWeight: 700,
              }}
            />
          }
          tooltip="The total amount of tokens auctioned so far."
          loading={isLoading}
        />

        <AuctionStat
          label="Min Price"
          value={
            <FormattedNumber
              value={minPrice}
              scaleDownDecimals={decimalsBiddingToken}
              maxDecimals={4}
              minThreshold={0.0001}
              symbol={`${symbolBiddingToken}/${symbolAuctioningToken}`}
              component="div"
              color="primary.main"
              sx={{
                fontSize: 18,
                fontWeight: 700,
              }}
            />
          }
          tooltip="The minimum acceptable bid price for the auctioned item."
          loading={isLoading}
        />
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
          <PriceVolumeChart
            series={priceVolumeHistogram}
            xReferenceLines={xReferenceLines}
          />
        </Stack>
      </Stack>

      <YourBids />
    </Box>
  );
};
