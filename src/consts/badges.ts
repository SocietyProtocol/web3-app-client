/**
 * Well-known badge identifiers used by the application.
 *
 * These are subgraph badge IDs that the UI needs to recognise to render
 * special behaviour (e.g. the Governor counter at the bottom of the
 * Governor BadgeCard).
 */
export const GOVERNOR_BADGE_ID = "13";

/**
 * Maximum number of Governor badges a single account is expected to hold.
 * Used as the denominator of the "x / N" counter shown on the Governor
 * BadgeCard in a user's profile.
 */
export const GOVERNOR_BADGE_MAX_COUNT = 10;
