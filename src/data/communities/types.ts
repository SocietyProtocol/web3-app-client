import {
  Community,
  Community_orderBy,
  OrderDirection,
  User,
} from "../../../.graphclient";

export enum CommunitySortOption {
  Id = "id",
  MemberCount = "memberCount",
}

export enum CommunityTabOption {
  All = "all",
  My = "my-communities",
}

export enum CommunityTier {
  Gold = "gold",
  Silver = "silver",
  Bronze = "bronze",
  Unaffiliated = "unaffiliated",
}

export interface CommunityQueryOptions {
  searchText?: string | null;
  managerAddress?: string | null;
  memberAddress?: string | null;
  tiers?: CommunityTier[] | undefined;
  orderBy?: Community_orderBy;
  orderDirection?: OrderDirection;
  pageSize?: number;
  skip?: number;
}

export interface CommunityData extends Omit<Community, "tier" | "manager"> {
  tier?: CommunityTier;
  memberCount: number;
  manager: Pick<User, "id" | "name" | "imageUrl" | "bio">;
}
