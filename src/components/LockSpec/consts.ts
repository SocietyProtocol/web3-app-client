import { SECONDS_PER_YEAR_BN } from "@/consts/time";
import { LockDuration, TierConfig, TierId } from "./types";

export const SPEC_DECIMALS = 18;

export const TIERS: TierConfig[] = [
  {
    id: TierId.BRONZE,
    name: "Bronze",
    benefits: [
      "Basic governance participation",
      "Community membership",
      "Access to selected protocol features",
      "More benefits coming soon",
    ],
    color: "#C97744",
    iconSrc: "/icons/tier-bronze.svg",
  },
  {
    id: TierId.SILVER,
    name: "Silver",
    benefits: [
      "Increased governance voting power",
      "Access to community initiatives",
      "Eligibility for protocol programs",
      "Additional benefits coming soon",
    ],
    color: "#CACACA",
    iconSrc: "/icons/tier-silver.svg",
  },
  {
    id: TierId.GOLD,
    name: "Gold",
    benefits: [
      "Maximum governance influence",
      "Priority access to protocol initiatives",
      "Early access to new features",
      "Exclusive benefits coming soon",
    ],
    color: "#F7A600",
    iconSrc: "/icons/tier-gold.svg",
  },
];

export const LOCK_DURATIONS: LockDuration[] = [
  LockDuration.ONE_YEAR,
  LockDuration.TWO_YEARS,
  LockDuration.THREE_YEARS,
  LockDuration.FOUR_YEARS,
];

export function getUnlockDate(years: number): string {
  const unlockTimestampMs =
    Date.now() + years * Number(SECONDS_PER_YEAR_BN) * 1000;
  const date = new Date(unlockTimestampMs);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getLockDurationLabel(years: number): string {
  return years === 1 ? "1 Year" : `${years} Years`;
}
