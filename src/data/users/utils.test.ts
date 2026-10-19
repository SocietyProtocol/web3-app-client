import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountRole, ALL_ACCOUNT_ROLES } from "../accounts/types";
import {
  buildWhereClause,
  fetchMigratedLegacyAccounts,
  fetchUsers,
  isUnfilteredAccountRoles,
} from "./utils";

const graph = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("../../../.graphclient", () => ({
  execute: graph.execute,
  UsersDocument: "UsersDocument",
}));

vi.mock("@/consts/legacy-account-map.json", () => ({
  default: {
    "1": {
      "0x00000000000000000000000000000000000000e1":
        "0x00000000000000000000000000000000000000A1",
      "0x00000000000000000000000000000000000000e2":
        "0x00000000000000000000000000000000000000A2",
    },
    "11155111": {
      "0x00000000000000000000000000000000000000e3":
        "0x00000000000000000000000000000000000000A3",
    },
  },
}));

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

  it("excludes only the ids it is given", () => {
    const where = buildWhereClause({
      includeUnregistered: false,
      excludeIds: ["0x00000000000000000000000000000000000000e1"],
    });
    expect(where.and).toEqual([
      { profile_not: null },
      { id_not_in: ["0x00000000000000000000000000000000000000e1"] },
    ]);
  });

  it("adds no exclusion for an empty list", () => {
    const where = buildWhereClause({
      includeUnregistered: true,
      excludeIds: [],
    });
    expect(where.and).toEqual([]);
  });
});

describe("migrated legacy accounts", () => {
  beforeEach(() => {
    graph.execute.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the old wallets whose Light Account has a profile", async () => {
    graph.execute.mockResolvedValueOnce({
      data: {
        users: [{ id: "0x00000000000000000000000000000000000000a2" }],
      },
    });

    const migrated = await fetchMigratedLegacyAccounts(1);

    expect(migrated).toEqual(["0x00000000000000000000000000000000000000e2"]);
    expect(graph.execute).toHaveBeenCalledWith(
      "UsersDocument",
      expect.objectContaining({
        where: {
          id_in: [
            "0x00000000000000000000000000000000000000a1",
            "0x00000000000000000000000000000000000000a2",
          ],
          profile_not: null,
        },
      }),
    );
  });

  it("uses the app chain, not mainnet, outside production", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "staging");
    graph.execute.mockResolvedValueOnce({ data: { users: [] } });

    await fetchMigratedLegacyAccounts();

    expect(graph.execute.mock.calls[0][1].where.id_in).toEqual([
      "0x00000000000000000000000000000000000000a3",
    ]);
  });

  it("skips the lookup when the chain has no legacy accounts", async () => {
    expect(await fetchMigratedLegacyAccounts(10)).toEqual([]);
    expect(graph.execute).not.toHaveBeenCalled();
  });

  it("filters the directory page by the migrated wallets", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENVIRONMENT", "production");
    graph.execute
      .mockResolvedValueOnce({
        data: {
          users: [{ id: "0x00000000000000000000000000000000000000a1" }],
        },
      })
      .mockResolvedValueOnce({ data: { users: [] } });

    await fetchUsers({ pageSize: 10, skip: 20 });

    const [, variables] = graph.execute.mock.calls[1];
    expect(variables).toMatchObject({ first: 10, skip: 20 });
    expect(variables.where.and).toContainEqual({
      id_not_in: ["0x00000000000000000000000000000000000000e1"],
    });
  });

  it("does not look up again when the exclusions are passed in", async () => {
    graph.execute.mockResolvedValueOnce({ data: { users: [] } });

    await fetchUsers({}, []);

    expect(graph.execute).toHaveBeenCalledTimes(1);
    expect(graph.execute.mock.calls[0][1].where.and).toEqual([
      { profile_not: null },
    ]);
  });
});

describe("isUnfilteredAccountRoles", () => {
  it("treats the full role set as unfiltered", () => {
    expect(isUnfilteredAccountRoles(ALL_ACCOUNT_ROLES)).toBe(true);
  });
});
