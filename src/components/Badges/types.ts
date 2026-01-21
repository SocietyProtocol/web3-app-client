import {
  Badge,
  Badge_orderBy,
  OrderDirection,
  User,
} from "../../../.graphclient";

export enum SortOption {
  Newest = "createdAt",
  Holders = "holdersCount",
  Name = "name",
  Id = "id",
}
export enum CreatedByOption {
  Anyone = "anyone",
  Me = "me",
  Address = "address",
}
export enum TabOption {
  All = "all",
  Managed = "managed-by-me",
  MyBadges = "my-badges",
}

export interface BadgeQueryOptions {
  searchText?: string | null;
  creatorAddress?: string | null;
  managerAddress?: string | null;
  holderAddress?: string | null;
  orderBy?: Badge_orderBy;
  orderDirection?: OrderDirection;
  pageSize?: number;
}

export type BadgeData = Pick<
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
> & { holders: Array<Pick<User, "id">>; managers: Array<Pick<User, "id">> };
