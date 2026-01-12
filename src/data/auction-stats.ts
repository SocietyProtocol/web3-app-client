import { AuctionStatProps } from "../components/Auction/AuctionStat";

export const mockAuctionStats: AuctionStatProps[] = [
  {
    label: "Current Price",
    value: "100 USDC/SPEC",
    tooltip: "The current highest bid price for the auctioned item.",
  },
  {
    icon: "/tokens/spec.svg",
    label: "Bidding With",
    value: "SPEC",
    tooltip: "The currency being used to place bids in this auction.",
  },
  {
    label: "Total Auctioned",
    value: "10 SPEC",
    tooltip: "The total amount of the item that has been auctioned.",
  },
  {
    label: "Min Price",
    value: "100.00 USDC/SPEC",
    tooltip: "The minimum acceptable bid price for the auctioned item.",
  },
];
