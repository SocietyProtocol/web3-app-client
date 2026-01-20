import {
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_HOUR,
  MILLISECONDS_PER_MINUTE,
  MILLISECONDS_PER_SECOND,
} from "@/consts/time";

export interface TimeRemaining {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

/**
 * Calculates the remaining time from a Unix timestamp (in seconds)
 * @param endTimestamp - The end timestamp in seconds
 * @returns Formatted time remaining as an object with days, hours, minutes, seconds
 */
export const calculateTimeRemaining = (endTimestamp: number): TimeRemaining => {
  const now = Date.now();
  const distance = endTimestamp * MILLISECONDS_PER_SECOND - now;

  if (distance < 0) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
    };
  }

  const days = Math.floor(distance / MILLISECONDS_PER_DAY);
  const hours = Math.floor(
    (distance % MILLISECONDS_PER_DAY) / MILLISECONDS_PER_HOUR
  );
  const minutes = Math.floor(
    (distance % MILLISECONDS_PER_HOUR) / MILLISECONDS_PER_MINUTE
  );
  const seconds = Math.floor(
    (distance % MILLISECONDS_PER_MINUTE) / MILLISECONDS_PER_SECOND
  );

  return {
    days: formatTimeUnit(days),
    hours: formatTimeUnit(hours),
    minutes: formatTimeUnit(minutes),
    seconds: formatTimeUnit(seconds),
  };
};

/**
 * Formats a time unit to a 2-digit string
 * @param value - The numeric value to format
 * @returns A 2-digit string representation (e.g., 5 becomes "05")
 */
const formatTimeUnit = (value: number): string => {
  return String(value).padStart(2, "0");
};
