import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { badge, link, memberWithProfile, newBadge } from "../../support/builders/entities";

/**
 * The subgraph fake itself, seen through /api/graphql: overlays and their
 * reset, the entity builders and the schema check, a lagging or stalled
 * subgraph. These are checks of the foundation, not of the route: the
 * route's contract is P1 to P8 in features/api.
 */
test.describe("subgraph fake", () => {
  test("SG-1: an overlay changes what the next query returns, for this test only", { tag: ["@core"] }, async ({
    graphql,
    subgraph,
  }) => {
    const before = await graphql<{ badge: { name: string } }>("Badge", { id: GOVERNOR_BADGE });
    await subgraph.overlay(badge(GOVERNOR_BADGE, { name: "Renamed by an overlay" }));
    const during = await graphql<{ badge: { name: string } }>("Badge", { id: GOVERNOR_BADGE });
    expect(during.data?.badge.name).toBe("Renamed by an overlay");

    await subgraph.reset();
    const after = await graphql<{ badge: { name: string } }>("Badge", { id: GOVERNOR_BADGE });
    expect(after.data?.badge.name).toBe(before.data?.badge.name);
    expect(after.data?.badge.name).not.toBe("Renamed by an overlay");
  });

  test("SG-2: builders add a member with a profile and a badge it holds", { tag: ["@core"] }, async ({
    graphql,
    subgraph,
    nextAccount,
  }) => {
    const address = nextAccount().address;
    await subgraph.overlay(
      memberWithProfile({ address, profileBadgeId: "900001", name: "Overlay Ada", bio: "Only in the fake." }),
      newBadge({ id: "900002", name: "Overlay Badge", createdBy: address, fields: { holdersCount: "1" } }),
      link("User", address, "badges", ["900002"]),
    );

    const user = await graphql<{
      user: { name: string | null; metadata: { name: string; bio: string }; profile: { id: string }; badges: { id: string }[] };
    }>("User", { id: address.toLowerCase() });
    expect(user.errors).toBeUndefined();
    expect(user.data?.user.profile.id).toBe("900001");
    expect(user.data?.user.metadata).toMatchObject({ name: "Overlay Ada", bio: "Only in the fake." });
    // The profile badge is filtered out by the query; the other badge is listed.
    expect(user.data?.user.badges.map((entry) => entry.id)).toEqual(["900002"]);

    // The derived side: the badge lists the user as its holder.
    const held = await graphql<{ badge: { holders: { id: string }[] } }>("Badge", { id: "900002" });
    expect(held.data?.badge.holders.map((holder) => holder.id)).toEqual([address.toLowerCase()]);

    // The fake enforces the schema like a subgraph does: a badge without its
    // required creator is an error, and the fake's request log says which field.
    await subgraph.overlay(badge("900003", { name: "No creator" }), link("User", address, "badges", ["900003"]));
    const broken = await graphql("User", { id: address.toLowerCase() });
    expect(broken.errors?.[0].message).toBe("GraphQL upstream request failed");
    expect((await subgraph.requests()).at(-1)?.errors?.[0]).toContain("user.badges.1.createdBy");
    await subgraph.reset();
    await subgraph.overlay(
      memberWithProfile({ address, profileBadgeId: "900001", name: "Overlay Ada", bio: "Only in the fake." }),
    );

    // A directory search finds the user by name, case-insensitively.
    const found = await graphql<{ users: { id: string }[] }>("Users", {
      first: 10,
      skip: 0,
      orderBy: "id",
      orderDirection: "asc",
      where: { metadata_: { name_contains_nocase: "overlay ada" } },
    });
    expect(found.errors).toBeUndefined();
    expect(found.data?.users.map((entry) => entry.id)).toEqual([address.toLowerCase()]);
  });

  test("SG-3: _meta can be held back, to imitate a subgraph that lags", { tag: ["@core"] }, async ({
    graphql,
    subgraph,
    chain,
  }) => {
    type Status = { _meta: { block: { number: number } } };
    await subgraph.setMeta({ freeze: true });
    const frozen = (await graphql<Status>("Status")).data!._meta.block.number;

    await chain.anvil.mine({ blocks: 2 });
    const head = Number(await chain.blockNumber());
    expect(head).toBeGreaterThanOrEqual(frozen + 2);
    expect((await graphql<Status>("Status")).data!._meta.block.number).toBe(frozen);

    await subgraph.unfreeze();
    expect((await graphql<Status>("Status")).data!._meta.block.number).toBeGreaterThanOrEqual(head);

    await subgraph.setMeta({ lagBlocks: 1 });
    const lagging = (await graphql<Status>("Status")).data!._meta.block.number;
    expect(lagging).toBe(Number(await chain.blockNumber()) - 1);
  });

  test(
    "SG-4: a stalled subgraph keeps its entities and _meta until it is released",
    { tag: ["@core"] },
    async ({ graphql, subgraph, actor, chain }) => {
      type Status = { _meta: { block: { number: number } } };
      type User = { user: { id: string; profile: { id: string } | null } | null };
      await subgraph.setMeta({ stall: true });
      const stalledAt = (await graphql<Status>("Status")).data!._meta.block.number;

      // Someone creates a profile on chain; the stalled fake does not see it.
      const member = await actor("member");
      const id = member.address.toLowerCase();
      expect(Number(await chain.blockNumber())).toBeGreaterThan(stalledAt);
      expect((await graphql<Status>("Status")).data!._meta.block.number).toBe(stalledAt);
      expect((await graphql<User>("User", { id })).data!.user).toBeNull();
      expect(await subgraph.entity("User", member.address)).toBeNull();
      expect(await subgraph.sync()).toBe(stalledAt);

      // Released, it applies what it missed.
      await subgraph.unfreeze();
      expect((await graphql<Status>("Status")).data!._meta.block.number).toBeGreaterThan(stalledAt);
      expect((await graphql<User>("User", { id })).data!.user?.profile?.id).toBe(String(member.profile!.badgeId));
    },
  );
});
