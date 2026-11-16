import type { TransactionReceipt } from "viem";
import { expect } from "../../fixtures";
import type { SubgraphFake } from "../../support/backends/subgraph";
import {
  communityMember,
  communityRoleBadges,
  fakeAddress,
  listedCommunity,
  nowInSeconds,
  type Tier,
} from "../../support/builders/communities-entities";
import { community, type OverlayOp } from "../../support/builders/entities";
import type { Chain } from "../../support/chain/chain";
import type { TestWallet } from "../../support/wallet/test-wallet";

/**
 * Steps shared by the community-detail specs.
 */

export const EXPLORER_TX = "https://sepolia.etherscan.io/tx/";

export type FakeMember = { address: string; name: string; joinedAt: number };

/**
 * A community that exists only in the subgraph fake, for the tests that
 * only look: the community with its three badges (ids `id`, `id + 1` and
 * `id + 2`: manager, assistant, member) and `members` named members, the
 * i-th of which joined i minutes after the first.
 */
export function fakeCommunity(input: {
  id: number;
  name: string;
  /** The manager's address; a fake one when left out. */
  manager?: string;
  tier?: Tier;
  tierExpiresAt?: number;
  description?: string | null;
  /** How many members to make, or their names. */
  members?: number | string[];
}): {
  ops: OverlayOp[];
  id: number;
  manager: string;
  managerBadgeId: number;
  assistantBadgeId: number;
  memberBadgeId: number;
  /** In the order they joined: the first is the oldest member. */
  members: FakeMember[];
} {
  const manager = (input.manager ?? fakeAddress(input.id)).toLowerCase();
  const names =
    typeof input.members === "number"
      ? Array.from({ length: input.members }, (_, index) => `Member ${String(index + 1).padStart(2, "0")}`)
      : (input.members ?? []);
  const firstJoin = nowInSeconds() - 30 * 24 * 60 * 60;
  const members = names.map((name, index) => ({
    // Far from the addresses fakeAddress(id) gives a manager.
    address: fakeAddress(input.id * 1_000 + index + 1),
    name,
    joinedAt: firstJoin + index * 60,
  }));
  const memberBadgeId = input.id + 2;
  return {
    id: input.id,
    manager,
    managerBadgeId: input.id,
    assistantBadgeId: input.id + 1,
    memberBadgeId,
    members,
    ops: [
      ...listedCommunity({
        id: input.id,
        name: input.name,
        manager,
        tier: input.tier ?? "gold",
        tierExpiresAt: input.tierExpiresAt,
        description: input.description,
        memberCount: members.length,
      }),
      ...communityRoleBadges({
        communityId: input.id,
        communityName: input.name,
        manager,
        assistantBadgeId: input.id + 1,
        memberBadgeId,
      }),
      ...members.flatMap((member) =>
        communityMember({
          communityId: input.id,
          address: member.address,
          name: member.name,
          badgeId: memberBadgeId,
          joinedAt: member.joinedAt,
        }),
      ),
      community(String(input.id), { memberCount: String(members.length) }),
    ],
  };
}

/**
 * Makes a write through the page and tells the subgraph fake what the real
 * subgraph would have indexed from it, before the page looks.
 *
 * The fake follows the badges contract but not the CommunityRegistry, and
 * it keeps no memberships: after a community write its Community and
 * CommunityMembership entities are what they were. The page waits for the
 * subgraph to reach the transaction's block and then asks again, so the
 * order here is:
 *
 *   1. hold the fake's `_meta` where it is (the page will sit in its
 *      "waiting for the subgraph" state);
 *   2. `act()`: the click that sends the transaction;
 *   3. wait for the wallet's transaction to be mined;
 *   4. push `index(receipt)` as an overlay: the entities as indexed;
 *   5. let `_meta` go: the page sees the block, refetches, and shows them.
 *
 * What this proves is that the page asks again after the write and renders
 * the new state. It does not prove that the real subgraph indexes it.
 * Clear the wallet's request log before calling this. Returns the receipt
 * of the last transaction the wallet sent.
 */
export async function indexAfter(
  deps: { subgraph: SubgraphFake; wallet: TestWallet; chain: Chain },
  act: () => Promise<void>,
  index: (receipt: TransactionReceipt) => OverlayOp[] | Promise<OverlayOp[]>,
): Promise<TransactionReceipt> {
  const { subgraph, wallet, chain } = deps;
  await subgraph.setMeta({ freeze: true });
  try {
    await act();
    await expect
      .poll(() => wallet.sendTransactionRequests().at(-1)?.hash, {
        message: "the wallet sent a transaction",
        timeout: 60_000,
      })
      .toBeTruthy();
    const receipt = await chain.receipt(wallet.sendTransactionRequests().at(-1)!.hash!);
    await subgraph.overlay(await index(receipt));
    return receipt;
  } finally {
    await subgraph.unfreeze();
  }
}
