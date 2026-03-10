export const EasyAuctionAbi = [
  {
    inputs: [
      { internalType: "uint256", name: "auctionId", type: "uint256" },
      { internalType: "bytes32[]", name: "_sellOrders", type: "bytes32[]" },
    ],
    name: "cancelSellOrders",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionId", type: "uint256" },
      { internalType: "uint96[]", name: "_minBuyAmounts", type: "uint96[]" },
      { internalType: "uint96[]", name: "_sellAmounts", type: "uint96[]" },
      { internalType: "bytes32[]", name: "_prevSellOrders", type: "bytes32[]" },
      { internalType: "bytes", name: "allowListCallData", type: "bytes" },
    ],
    name: "placeSellOrders",
    outputs: [{ internalType: "uint64", name: "userId", type: "uint64" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
