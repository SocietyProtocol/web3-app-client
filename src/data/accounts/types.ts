export enum AccountSortOption {
  Newest = "profile__createdAt",
  Name = "name",
}

export enum AccountRole {
  Governors = "governor",
  Contributors = "contributor",
  CoreTeam = "core-team",
  Advisors = "advisor",
  Moderators = "moderator",
  Basic = "basic",
}

export const ALL_ACCOUNT_ROLES: AccountRole[] = [
  AccountRole.Governors,
  AccountRole.Contributors,
  AccountRole.CoreTeam,
  AccountRole.Advisors,
  AccountRole.Moderators,
  AccountRole.Basic,
];
