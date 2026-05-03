import {
  MemberJoinedActivity,
  OrderDirection,
  User,
} from "../../../.graphclient";

export type CommunityMember = Pick<MemberJoinedActivity, "id" | "timestamp"> & {
  user: Pick<User, "id" | "name" | "bio" | "imageUrl">;
};

export enum CommunityMembersSortOption {
  Newest = "newest",
  Oldest = "oldest",
  Name = "name",
}

export interface CommunityMembersQueryOptions {
  communityId: string;
  searchText?: string | null;
  orderBy?: CommunityMembersSortOption;
  orderDirection?: OrderDirection;
  pageSize?: number;
  skip?: number;
}
