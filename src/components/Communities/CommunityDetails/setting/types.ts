export enum CommunityBadgeRole {
  manager = "manager",
  assistant = "assistant",
  member = "member",
}

export const BADGE_ROLE_LABELS: Record<CommunityBadgeRole, string> = {
  [CommunityBadgeRole.manager]: "Manager Badge",
  [CommunityBadgeRole.assistant]: "Assistant Badge",
  [CommunityBadgeRole.member]: "Member Badge",
};
