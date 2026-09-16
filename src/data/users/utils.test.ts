import { describe, expect, it } from "vitest";
import { AccountRole, ALL_ACCOUNT_ROLES } from "../accounts/types";
import { buildWhereClause, isUnfilteredAccountRoles } from "./utils";

describe("buildWhereClause", () => {
  it("omits role filters when all roles are selected", () => {
    const where = buildWhereClause({
      roles: ALL_ACCOUNT_ROLES,
      includeUnregistered: false,
    });
    expect(where.and).toEqual([{ profile_not: null }]);
  });

  it("omits role filters when the role list is empty", () => {
    const where = buildWhereClause({
      roles: [],
      includeUnregistered: false,
    });
    expect(where.and).toEqual([{ profile_not: null }]);
  });

  it("filters governors by protocolRoles_contains", () => {
    const where = buildWhereClause({
      roles: [AccountRole.Governors],
      includeUnregistered: false,
    });
    expect(where.and).toEqual([
      { profile_not: null },
      { protocolRoles_contains: ["GOVERNOR"] },
    ]);
  });

  it("filters basic accounts by protocolRoleCount 0", () => {
    const where = buildWhereClause({
      roles: [AccountRole.Basic],
      includeUnregistered: false,
    });
    expect(where.and).toEqual([
      { profile_not: null },
      { protocolRoleCount: 0 },
    ]);
  });

  it("ORs governor and basic filters", () => {
    const where = buildWhereClause({
      roles: [AccountRole.Governors, AccountRole.Basic],
      includeUnregistered: false,
    });
    expect(where.and).toEqual([
      { profile_not: null },
      {
        or: [
          { protocolRoles_contains: ["GOVERNOR"] },
          { protocolRoleCount: 0 },
        ],
      },
    ]);
  });

  it("still ANDs search with role filters", () => {
    const where = buildWhereClause({
      searchText: "zed",
      roles: [AccountRole.Advisors],
      includeUnregistered: false,
    });
    expect(where.and?.[0]).toEqual({
      or: [
        { name_contains_nocase: "zed" },
        { metadata_: { name_contains_nocase: "zed" } },
        { id: "zed" },
      ],
    });
    expect(where.and?.[2]).toEqual({
      protocolRoles_contains: ["ADVISOR"],
    });
  });
});

describe("isUnfilteredAccountRoles", () => {
  it("treats the full role set as unfiltered", () => {
    expect(isUnfilteredAccountRoles(ALL_ACCOUNT_ROLES)).toBe(true);
  });
});
