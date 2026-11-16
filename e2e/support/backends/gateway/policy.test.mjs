// Unit tests of the gateway checks the subgraph fake applies (policy.mjs).
// They run with vitest (`yarn test`), not with Playwright.
import { describe, expect, it, vi } from "vitest";
import { PERSISTED_GRAPH_DOCUMENTS } from "@/lib/persisted-graphql.generated";
import { BadgeCategory, BadgeSortOption } from "@/data/badges/types";
import { fetchBadges } from "@/data/badges/utils";
import { CommunitySortOption, CommunityTier } from "@/data/communities/types";
import { fetchCommunities } from "@/data/communities/utils";
import { CommunityMembersSortOption } from "@/data/community-members/types";
import { fetchCommunityMembers } from "@/data/community-members/utils";
import { fetchUsers } from "@/data/users/utils";
import { GATEWAY_SOURCE, PERSISTED_DOCUMENTS, gatewayRefusal } from "./policy.mjs";

const graph = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("../../../../.graphclient", () => ({
  execute: graph.execute,
  BadgesDocument: "BadgesDocument",
  CommunitiesDocument: "CommunitiesDocument",
  CommunityMembersDocument: "CommunityMembersDocument",
  UsersDocument: "UsersDocument",
}));

/**
 * The body the app's server sends for one persisted query, as it arrives:
 * through JSON, which drops the variables and fields that are undefined.
 */
const body = (operationName, variables) =>
  JSON.parse(JSON.stringify({ query: PERSISTED_GRAPH_DOCUMENTS.get(operationName), operationName, variables }));

/** What the gateway answers: undefined when it passes the request on. */
const answer = (operationName, variables) => {
  const refusal = gatewayRefusal(body(operationName, variables));
  return refusal && { status: refusal.status, message: refusal.message };
};

const LIMITS = { status: 400, message: "GraphQL variables exceed operation limits" };
const address = (index) => `0x${index.toString(16).padStart(40, "0")}`;

/** The variables of every query the app sends for `fetch`, in order. */
async function variablesOf(fetch) {
  graph.execute.mockReset();
  graph.execute.mockResolvedValue({ data: { badges: [], communities: [], communityMemberships: [], users: [] } });
  await fetch();
  return graph.execute.mock.calls.map((call) => call[1]);
}

describe("the gateway snapshot", () => {
  it("records where it comes from", () => {
    expect(GATEWAY_SOURCE).toMatchObject({
      repository: "web3-app-subgraph",
      path: "infra/query-gateway/generated/registry.js",
      commit: expect.stringMatching(/^[0-9a-f]{40}$/),
    });
  });

  it("has exactly the app's persisted documents, word for word", () => {
    // A query changed under src/queries needs the gateway's registry changed
    // with it, or every request for it is refused on staging and production.
    expect(Object.keys(PERSISTED_DOCUMENTS).sort()).toEqual([...PERSISTED_GRAPH_DOCUMENTS.keys()].sort());
    for (const [name, document] of PERSISTED_GRAPH_DOCUMENTS) {
      expect(PERSISTED_DOCUMENTS[name].query, name).toBe(document);
      expect(answer(name, undefined)?.message, name).not.toBe("GraphQL document is not an approved persisted query");
    }
  });
});

describe("the gateway checks, as the gateway's own tests have them", () => {
  it("passes the filters the gateway's tests accept", () => {
    const page = { first: 5, skip: 0, orderDirection: "desc" };
    const legacy = Array.from({ length: 35 }, (_, index) => address(index + 1));
    const owners = [address(100), address(101)];
    expect(answer("Status", {})).toBeUndefined();
    expect(answer("Status", undefined)).toBeUndefined();
    expect(
      answer("Users", {
        ...page,
        orderBy: "profile__createdAt",
        where: { and: [{ profile_not: null }, { protocolRoles_contains: ["GOVERNOR"] }] },
      }),
    ).toBeUndefined();
    expect(answer("Users", { ...page, first: 1000, orderBy: "profile__createdAt", where: { id_in: legacy, profile_not: null } })).toBeUndefined();
    expect(answer("Badges", { ...page, orderBy: "createdAt", where: { and: [{ managers_: { id_in: owners } }] } })).toBeUndefined();
    expect(answer("Communities", { ...page, orderBy: "createdAt", where: { and: [{ manager_: { id_in: owners } }] } })).toBeUndefined();
  });

  it("refuses what the gateway's tests refuse", () => {
    let nested = { id: "1" };
    for (let index = 0; index <= 3; index += 1) nested = { and: [nested] };
    const list = { skip: 0, orderBy: "id", orderDirection: "desc" };
    expect(answer("Badges", { ...list, first: 1_001 })).toEqual(LIMITS);
    expect(answer("Badges", { ...list, first: 100, where: { name_contains_nocase: "x".repeat(257) } })).toEqual(LIMITS);
    expect(answer("Badges", { ...list, first: 100, where: { or: Array.from({ length: 33 }, () => ({ id: "1" })) } })).toEqual(LIMITS);
    expect(answer("Badges", { ...list, first: 100, where: nested })).toEqual(LIMITS);
    expect(answer("Status", { notDeclared: true })).toEqual({ status: 400, message: "Undeclared GraphQL variable" });
    expect(answer("Status", [])).toEqual(LIMITS);
  });

  it("refuses a filter key outside the operation's allowedKeys, and an enum value it does not list", () => {
    const page = { first: 5, skip: 0, orderDirection: "asc" };
    expect(answer("Users", { ...page, orderBy: "name", where: { bio_contains: "x" } })).toEqual(LIMITS);
    expect(answer("Users", { ...page, orderBy: "id" })).toEqual(LIMITS);
    expect(answer("Users", { ...page, orderBy: "name" })).toBeUndefined();
  });

  it("refuses a document that is not persisted, or sent under another name", () => {
    const status = PERSISTED_GRAPH_DOCUMENTS.get("Status");
    const notPersisted = { status: 400, message: "GraphQL document is not an approved persisted query" };
    const refusal = (parsed) => {
      const found = gatewayRefusal(parsed);
      return found && { status: found.status, message: found.message };
    };
    expect(refusal({ query: status.replace("query Status", "query Other") })).toEqual(notPersisted);
    expect(refusal({ query: "{ _meta { block { number } } }" })).toEqual({ status: 400, message: "Only named queries are allowed" });
    expect(refusal({ query: status, operationName: "Users" })).toEqual({ status: 400, message: "Operation name does not match the query" });
    expect(refusal({ query: status, extensions: {} })).toEqual({ status: 400, message: "Unsupported GraphQL request field" });
  });
});

describe("the app's own filters", () => {
  it("the accounts directory search passes", async () => {
    // Two queries: the old wallets to hide (an id_in lookup), then the search.
    const sent = await variablesOf(() => fetchUsers({ searchText: "ada lovelace" }));
    expect(JSON.stringify(sent.at(-1).where)).toContain("metadata_");
    for (const variables of sent) expect(answer("Users", variables)).toBeUndefined();
  });

  it("the badges list with a search, every filter and every sort passes", async () => {
    const owners = [address(1), address(2)];
    for (const orderBy of Object.values(BadgeSortOption)) {
      const sent = await variablesOf(() =>
        fetchBadges({
          searchText: "ada",
          creatorAddress: address(3),
          managerAddress: owners,
          holderAddress: address(4),
          categories: Object.values(BadgeCategory),
          orderBy,
          skip: 0,
        }),
      );
      for (const variables of sent) expect(answer("Badges", variables), orderBy).toBeUndefined();
    }
  });

  it("the communities list with a search, the tier filters and every sort passes", async () => {
    const tierSelections = [[CommunityTier.Gold], [CommunityTier.Gold, CommunityTier.Unaffiliated], Object.values(CommunityTier)];
    for (const [orderBy, tiers] of Object.values(CommunitySortOption).flatMap((sort) =>
      tierSelections.map((selection) => [sort, selection]),
    )) {
      const sent = await variablesOf(() =>
        fetchCommunities({
          searchText: "guild",
          managerAddress: [address(1), address(2)],
          memberAddress: address(3),
          tiers,
          orderBy,
          skip: 0,
        }),
      );
      for (const variables of sent) expect(answer("Communities", variables), orderBy).toBeUndefined();
    }
  });

  it("the members tab without a search passes", async () => {
    const [variables] = await variablesOf(() =>
      fetchCommunityMembers({ communityId: "116", orderBy: CommunityMembersSortOption.Name }),
    );
    expect(answer("CommunityMembers", variables)).toBeUndefined();
  });

  // KNOWN GATEWAY BUG, expected to fail until the gateway fix ships and this
  // snapshot is refreshed (README.md here): the member search of a community
  // sends `user_: { and: [{ or: [..., { metadata_: { name_contains_nocase } }] }] }`.
  // The gateway's CommunityMembers policy does not list `metadata_` and allows
  // a depth of 6, and the search string sits at depth 7. The fix is in
  // web3-app-subgraph, infra/query-gateway/generated/registry.js: `metadata_`
  // in the CommunityMembers allowedKeys and maxDepth 7. Remove `.fails` when
  // refresh.mjs brings that in; K5's member search (community-detail.spec.ts)
  // turns green at the same time.
  it.fails("the members tab search passes", async () => {
    const [variables] = await variablesOf(() => fetchCommunityMembers({ communityId: "116", searchText: "ada" }));
    expect(answer("CommunityMembers", variables)).toBeUndefined();
  });

  // Pins the cause of the failure above, so that `.fails` cannot hide another
  // one. Delete this test together with `.fails`.
  it("the members tab search is refused for its metadata clause, nothing else", async () => {
    const [variables] = await variablesOf(() => fetchCommunityMembers({ communityId: "116", searchText: "ada" }));
    expect(answer("CommunityMembers", variables)).toEqual(LIMITS);
    const withoutMetadata = structuredClone(variables);
    withoutMetadata.where.user_.and[0].or = withoutMetadata.where.user_.and[0].or.filter((clause) => !clause.metadata_);
    expect(answer("CommunityMembers", withoutMetadata)).toBeUndefined();
  });
});
