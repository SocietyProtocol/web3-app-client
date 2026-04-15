import { SECONDS_PER_YEAR_BN } from "@/consts/time";
import { LockDuration, TierConfig, TierId } from "./types";

export const SPEC_DECIMALS = 18;

export const TIERS: TierConfig[] = [
  {
    id: TierId.BRONZE,
    name: "Bronze",
    description:
      "(Serious community chat) Exclusive access to support from the core team. - Get away from the spam of a noisy unbarred community full of newbies into a more aligned an intimate space of people committed to make the Synchronized Network State movement happen.",
    color: "warning.light",
    iconSrc: "/icons/tier-bronze.svg",
  },
  {
    id: TierId.SILVER,
    name: "Silver",
    description:
      "(Partner community hub) - Exclusive access to representatives of our partner communities - Opportunities to network, form real-life hub connections, and access an aligned community of Network States and Web3 experts––all traveling the same path.",
    color: "text.primary",
    iconSrc: "/icons/tier-silver.svg",
  },
  {
    id: TierId.GOLD,
    name: "Gold",
    description: "(Elite tier) - Exclusive access to founders & advisors",
    color: "gold.light",
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
