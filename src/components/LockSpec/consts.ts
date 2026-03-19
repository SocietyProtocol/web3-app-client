import { parseUnits } from "viem";
import { LockDuration, TierConfig, TierId } from "./types";

export const SPEC_DECIMALS = 18;

export const TIERS: TierConfig[] = [
  {
    id: TierId.BRONZE,
    name: "Bronze",
    requiredSpec: parseUnits("400000", SPEC_DECIMALS),
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
    requiredSpec: parseUnits("2000000", SPEC_DECIMALS),
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
    requiredSpec: parseUnits("10000000", SPEC_DECIMALS),
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
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getLockDurationLabel(years: number): string {
  return years === 1 ? "1 Year" : `${years} Years`;
}
