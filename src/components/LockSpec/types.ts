export enum TierId {
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
}
export enum LockDuration {
  ONE_YEAR = 1,
  TWO_YEARS = 2,
  THREE_YEARS = 3,
  FOUR_YEARS = 4,
}

export enum LockSpecTab {
  LOCK = "lock",
  CLAIM = "claim",
  HISTORY = "history",
}

// Valid theme palette paths for tier colors
export type TierColorPath = "warning.light" | "text.primary" | "gold.light";

export interface TierConfig {
  id: TierId;
  name: string;
  description: string;
  color: TierColorPath;
  iconSrc: string;
}
