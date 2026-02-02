export enum AuctionStatusEnum {
  ACTIVE = "Active",
  ENDED = "Ended",
  INACTIVE = "Inactive",
}

export interface AuctionStatusProps {
  size?: "small" | "medium";
}
