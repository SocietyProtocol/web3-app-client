import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWhereClause,
  fetchCommunityMembers,
  MAX_NAME_MATCHES,
} from "./utils";
import { CommunityMembersSortOption } from "./types";

const graph = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("../../../.graphclient", () => ({
  execute: graph.execute,
  CommunityMembersDocument: "CommunityMembersDocument",
  UsersDocument: "UsersDocument",
}));

/** Child-filter keys (ending in "_") at any depth under value. */
const childFilterKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(childFilterKeys);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => [
    ...(key.endsWith("_") ? [key] : []),
    ...childFilterKeys(item),
  ]);
};

describe("buildWhereClause", () => {
  it("filters by community only without a search", () => {
    expect(buildWhereClause("116", "")).toEqual({ community_: { id: "116" } });
  });

  it("searches the user's own fields only, one child filter deep", () => {
    const where = buildWhereClause("116", "Alice", ["0xa1", "0xa2"]);
    expect(where).toEqual({
      community_: { id: "116" },
      user_: {
        or: [
          { name_contains_nocase: "Alice" },
          { id: "alice" },
          { id_in: ["0xa1", "0xa2"] },
        ],
      },
    });
    expect(childFilterKeys(where.user_)).toEqual([]);
    expect(JSON.stringify(where)).not.toContain("metadata_");
  });

  it("leaves out id_in when no profile name matched", () => {
    const where = buildWhereClause("116", "0xAbC");
    expect(where.user_).toEqual({
      or: [{ name_contains_nocase: "0xAbC" }, { id: "0xabc" }],
    });
  });
});

describe("fetchCommunityMembers", () => {
  beforeEach(() => {
    graph.execute.mockReset();
  });

  it("looks up profile-name matches with a single-level Users filter first", async () => {
    graph.execute
      .mockResolvedValueOnce({ data: { users: [{ id: "0xa1" }] } })
      .mockResolvedValueOnce({ data: { communityMemberships: [] } });

    await fetchCommunityMembers({
      communityId: "116",
      searchText: "  alice   b ",
      orderBy: CommunityMembersSortOption.Newest,
      pageSize: 11,
      skip: 0,
    });

    expect(graph.execute).toHaveBeenCalledTimes(2);
    const [usersDocument, usersVariables] = graph.execute.mock.calls[0];
    expect(usersDocument).toBe("UsersDocument");
    expect(usersVariables).toEqual({
      first: MAX_NAME_MATCHES,
      skip: 0,
      orderBy: "profile__createdAt",
      orderDirection: "asc",
      where: {
        communities_contains: ["116"],
        metadata_: { name_contains_nocase: "alice b" },
      },
    });

    const [membersDocument, membersVariables] = graph.execute.mock.calls[1];
    expect(membersDocument).toBe("CommunityMembersDocument");
    expect(membersVariables.where).toEqual({
      community_: { id: "116" },
      user_: {
        or: [
          { name_contains_nocase: "alice b" },
          { id: "alice b" },
          { id_in: ["0xa1"] },
        ],
      },
    });
    expect(childFilterKeys(membersVariables.where.user_)).toEqual([]);
  });

  it("sends only the community filter without a search", async () => {
    graph.execute.mockResolvedValueOnce({ data: { communityMemberships: [] } });

    await fetchCommunityMembers({ communityId: "116" });

    expect(graph.execute).toHaveBeenCalledTimes(1);
    expect(graph.execute.mock.calls[0][1].where).toEqual({
      community_: { id: "116" },
    });
  });
});
