import { Badge, OrderDirection, User, UsersQuery } from "../../../.graphclient";
import { AccountSortOption } from "../accounts/types";

export interface UserQueryOptions {
  searchText?: string | null;
  orderBy?: AccountSortOption;
  orderDirection?: OrderDirection;
  pageSize?: number;
  skip?: number;
  onSuccess?: (data: UsersQuery) => void;
  includeUnregistered?: boolean;
}

export type UserData = Pick<User, "id" | "name" | "imageUrl" | "bio"> & {
  badges: Array<
    Pick<
      Badge,
      | "id"
      | "name"
      | "isOfficial"
      | "isCommunity"
      | "uri"
      | "hookAddress"
      | "imageUrl"
      | "creatorAddress"
      | "createdAt"
      | "holdersCount"
    > & {
      holders: Array<Pick<User, "id">>;
      managers: Array<Pick<User, "id">>;
    }
  >;
  managedBadges: Array<
    Pick<
      Badge,
      | "id"
      | "name"
      | "isOfficial"
      | "isCommunity"
      | "uri"
      | "hookAddress"
      | "imageUrl"
      | "creatorAddress"
      | "createdAt"
      | "holdersCount"
    > & {
      holders: Array<Pick<User, "id">>;
      managers: Array<Pick<User, "id">>;
    }
  >;
};
