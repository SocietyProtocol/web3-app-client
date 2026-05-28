import {
  Badge,
  Badge_orderBy,
  Community,
  OrderDirection,
  User,
} from "../../../.graphclient";

export enum BadgeSortOption {
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
  includeProfile?: boolean;
  isCommunity?: boolean;
  orderBy?: Badge_orderBy;
  orderDirection?: OrderDirection;
  pageSize?: number;
  skip?: number;
}

export type BadgeData = Pick<
  Badge,
  | "id"
  | "name"
  | "description"
  | "isOfficial"
  | "isCommunity"
  | "uri"
  | "hookAddress"
  | "imageUrl"
  | "creatorAddress"
  | "createdAt"
> & {
  createdBy?: Pick<User, "id" | "name" | "bio" | "imageUrl"> | null;
  holders: Array<Pick<User, "id" | "name" | "bio" | "imageUrl">>;
  managers: Array<Pick<User, "id" | "name" | "bio" | "imageUrl">>;
  community?: Pick<Community, "id" | "name"> | null;
};

export type FullBadgeData = BadgeData & {
  minters: Array<
    Pick<Badge, "id" | "name"> & {
      holders: Array<Pick<User, "id">>;
    }
  >;
  burners: Array<
    Pick<Badge, "id" | "name"> & {
      holders: Array<Pick<User, "id">>;
    }
  >;
  transferers: Array<
    Pick<Badge, "id" | "name"> & {
      holders: Array<Pick<User, "id">>;
    }
  >;
};
