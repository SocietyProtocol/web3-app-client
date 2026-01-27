import {
  Badge,
  OrderDirection,
  User,
  User_orderBy,
} from "../../../.graphclient";

export interface UserQueryOptions {
  searchText?: string | null;
  orderBy?: User_orderBy;
  orderDirection?: OrderDirection;
  pageSize?: number;
  skip?: number;
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
