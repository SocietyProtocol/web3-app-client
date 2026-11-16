import { badge, user, type OverlayOp } from "./entities";

/**
 * Seeding helpers of the badges area (features/badges).
 */

/** A small picture: a green disc. Served by the S3 fake as image/svg+xml. */
export const BADGE_PICTURE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
  '<circle cx="32" cy="32" r="30" fill="#2e7d32"/></svg>';

/**
 * `count` individual badges that exist only in the subgraph fake, named
 * "<namePrefix> 0001", "<namePrefix> 0002", ... with ids counting up from
 * `firstId`. For the badges list, which reads the subgraph only. Pass the
 * result to `subgraph.overlay(...)`.
 */
export function manyBadges(input: {
  count: number;
  namePrefix: string;
  createdBy: string;
  /** Far above any id the chain hands out in a run. */
  firstId?: bigint;
}): OverlayOp[] {
  const firstId = input.firstId ?? BigInt(10) ** BigInt(12);
  const createdAt = Math.floor(Date.now() / 1000);
  const creator = input.createdBy.toLowerCase();
  // The schema requires a badge's creator: one User for all of them.
  return [
    user(creator),
    ...Array.from({ length: input.count }, (_, index) =>
      badge(firstId + BigInt(index), {
        name: `${input.namePrefix} ${String(index + 1).padStart(4, "0")}`,
        createdBy: creator,
        creatorAddress: creator,
        createdAt: String(createdAt + index),
      }),
    ),
  ];
}
