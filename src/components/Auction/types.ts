export enum AuctionStatusEnum {
  ACTIVE = "Active",
  ENDED = "Ended",
  INACTIVE = "Inactive",
}

export interface AuctionStatusProps {
  status: AuctionStatusEnum;
  size?: "small" | "medium";
}
