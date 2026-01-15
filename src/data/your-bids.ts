interface YourBid {
  id: string;
  amount: number;
  tokenSymbol: string;
  price: number;
  status: "Placed" | "Pending" | "Cancelled";
}

export const mockYourBids: YourBid[] = [
  {
    id: "bid1",
    amount: 150,
    tokenSymbol: "USDC",
    price: 100,
    status: "Placed",
  },
  {
    id: "bid2",
    amount: 200,
    tokenSymbol: "USDC",
    price: 120,
    status: "Pending",
  },
  {
    id: "bid3",
    amount: 250,
    tokenSymbol: "USDC",
    price: 130,
    status: "Pending",
  },
];
