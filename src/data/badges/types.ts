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

/**
 * Visual categories surfaced as toggle filters on the Badges page.
 *
 * `Official`, `Community` and `Individual` map directly to on-chain flags
 * (`isOfficial`, `isCommunity`). `NonAffiliated` is reserved for badges
 * issued by parties not affiliated with Society Protocol; under the
 * current subgraph schema no badge classifies into it (every badge is
 * Official, Community or Individual), so the filter currently returns no
 * additional results.
 */
export enum BadgeCategory {
  Official = "official",
  Community = "community",
  Individual = "individual",
  NonAffiliated = "non-affiliated",
}

export interface BadgeQueryOptions {
  searchText?: string | null;
  creatorAddress?: string | null;
  managerAddress?: string | null;
  holderAddress?: string | null;
  includeProfile?: boolean;
  isCommunity?: boolean;
  categories?: BadgeCategory[];
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
  holders?: Array<Pick<User, "id" | "name" | "bio" | "imageUrl">>;
  managers?: Array<Pick<User, "id" | "name" | "bio" | "imageUrl">>;
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
