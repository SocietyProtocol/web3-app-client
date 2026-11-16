import { Address, isAddress } from "viem";

/**
 * The address whose User an avatar has to look up for its image, or
 * undefined when it needs no request: no valid address, or the caller
 * already has the user's subgraph image (`null` meaning "has none"), as a
 * directory card does from its Users page. Without this every card of the
 * accounts directory asked /api/graphql for its own User.
 *
 * @param address Address the avatar is for
 * @param userImageUrl The user's image from the subgraph; undefined if unknown
 * @returns Address to look up, or undefined
 */
export const avatarLookupAddress = (
  address?: string,
  userImageUrl?: string | null,
): Address | undefined =>
  userImageUrl === undefined && address && isAddress(address)
    ? address
    : undefined;
