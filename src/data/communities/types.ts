import {
  Community,
  Community_orderBy,
  OrderDirection,
  User,
} from "../../../.graphclient";

export enum CommunitySortOption {
  Tier = "tierId",
  Alphabetical = "name",
  Newest = "createdAt",
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
  /** One address, or every address the member acts as. */
  managerAddress?: string | string[] | null;
  memberAddress?: string | null;
  tiers?: CommunityTier[] | undefined;
  orderBy?: Community_orderBy;
  orderDirection?: OrderDirection;
  pageSize?: number;
  skip?: number;
}

export interface CommunityData extends Omit<
  Community,
  "tier" | "tierExpiresAt" | "manager" | "metadata"
> {
  tierName: CommunityTier;
  tierExpiresAt: string;
  memberCount: number;
  manager: Pick<User, "id" | "name" | "imageUrl" | "bio">;
}

