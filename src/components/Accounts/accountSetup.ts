import type { UserQuery } from "../../../.graphclient";

/**
 * Whether the accounts directory offers "Setup Account".
 *
 * The subgraph can know an address without it having a profile (for
 * example, an address that was sent a badge), so the check is on the
 * profile, not on the User entity.
 */
export const offersAccountSetup = (user: {
  isLoading: boolean;
  data?: UserQuery["user"] | null;
}): boolean => !user.isLoading && !user.data?.profile;
