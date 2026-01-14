interface YourBid {
  amount: number;
  tokenSymbol: string;
  price: number;
  status: "Placed" | "Pending" | "Cancelled";
}

export const mockYourBids: YourBid[] = [
  {
    amount: 150,
    tokenSymbol: "USDC",
    price: 100,
    status: "Placed",
  },
  {
    amount: 200,
    tokenSymbol: "USDC",
    price: 120,
    status: "Pending",
  },
  {
    amount: 250,
    tokenSymbol: "USDC",
    price: 130,
    status: "Pending",
  },
];
