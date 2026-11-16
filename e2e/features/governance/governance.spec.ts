import { encodeFunctionData, type Address } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { GOVERNOR_BADGE } from "../../env/hermetic";
import { expect, test } from "../../fixtures";
import { unlink } from "../../support/builders/entities";
import { expectOwnerPaidThroughAccount } from "../../support/write-route";

/**
 * /governance: the list of Governors with their voting power.
 *
 * A Governor's chip reads "n / total · p%": n is the account's balance of
 * the Governor badge, total is the badge's total supply, both read from the
 * chain by the page. The tests take both numbers from the chain themselves.
 */

/**
 * n of total as the page should print it: a percentage rounded half up to
 * two decimals, without trailing zeros ("9.09", "27.5", "50"). Worked out
 * here in integers, on purpose not with the app's own formatter.
 */
function percentText(count: bigint, total: bigint): string {
  const hundredths = (count * BigInt(20_000) + total) / (total * BigInt(2));
  const whole = hundredths / BigInt(100);
  const fraction = (hundredths % BigInt(100)).toString().padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

const votingPower = (count: bigint, total: bigint) => `${count} / ${total} · ${percentText(count, total)}%`;

/** The call the page makes for the Governor badge's total supply. */
const TOTAL_SUPPLY_CALL = encodeFunctionData({
  abi: SocietyProtocolBadgesABI,
  functionName: "totalSupply",
  args: [BigInt(GOVERNOR_BADGE)],
});

test.describe("governance", () => {
  test(
    "L2: the denominator on every Governor chip is the badge's total supply on chain",
    { tag: ["@smoke"] },
    async ({ actor, pages, chain, subgraph }) => {
      // The denominator used to be the constant 11. Keep the real supply
      // away from it, so that the constant cannot pass.
      if ((await chain.badgeTotalSupply(GOVERNOR_BADGE)) === BigInt(11)) await actor("governor");
      const totalSupply = await chain.badgeTotalSupply(GOVERNOR_BADGE);
      const governors = await subgraph.holdersOf(GOVERNOR_BADGE);
      expect(totalSupply).not.toBe(BigInt(11));
      expect(governors.length).toBeGreaterThan(6);

      await pages.governance.open();
      const list = pages.governance.governors;
      await expect(list.section).toContainText(`Governors (${governors.length})`);

      // The cards in the section: the first six governors.
      const shown = await list.addresses();
      expect(shown).toHaveLength(6);
      for (const governor of shown) {
        expect(governors).toContain(governor);
        const chip = pages.governance.votingPowerChip(list.row(governor));
        await expect(chip).toHaveAttribute("data-total", `${totalSupply}`);
        await expect(chip).toContainText(` / ${totalSupply} · `);
      }

      // The modal: every governor, once, each with the same denominator.
      const inModal = await list.visitModal(async (_governor, card) => {
        const chip = pages.governance.votingPowerChip(card);
        await expect(chip).toHaveAttribute("data-total", `${totalSupply}`);
        await expect(chip).toContainText(` / ${totalSupply} · `);
      });
      expect([...inModal].sort()).toEqual([...governors].sort());
    },
  );

  test(
    "L3: each Governor shows n / total and the share of the supply, and the shares add up to 100%",
    { tag: ["@smoke"] },
    async ({ actor, pages, chain, subgraph }) => {
      // A governor with three units, so that the shares are not all alike.
      const heavy = await actor("governor");
      await chain.mintBadge({ badgeId: GOVERNOR_BADGE, to: heavy.address, amount: BigInt(2) });

      const totalSupply = await chain.badgeTotalSupply(GOVERNOR_BADGE);
      const governors = await subgraph.holdersOf(GOVERNOR_BADGE);
      const units = new Map<string, bigint>();
      for (const governor of governors) {
        units.set(governor, await chain.badgeBalance(governor as Address, GOVERNOR_BADGE));
      }
      expect(units.get(heavy.address.toLowerCase())).toBe(BigInt(3));
      // Every unit of the supply is held by a governor on the list.
      expect([...units.values()].reduce((sum, held) => sum + held, BigInt(0))).toBe(totalSupply);

      await pages.governance.open();
      const list = pages.governance.governors;
      await expect(list.section).toContainText(`Governors (${governors.length})`);

      // The cards in the section.
      for (const governor of await list.addresses()) {
        await expect(pages.governance.votingPowerChip(list.row(governor))).toHaveText(
          votingPower(units.get(governor)!, totalSupply),
        );
      }

      // Every governor, in the modal. Each chip is compared as a whole, so
      // the shares added up below are the ones on the page.
      let shareSum = 0;
      const inModal = await list.visitModal(async (governor, card) => {
        const held = units.get(governor);
        expect(held, `${governor} is a governor in the subgraph`).toBeDefined();
        await expect(pages.governance.votingPowerChip(card)).toHaveText(votingPower(held!, totalSupply));
        shareSum += Number(percentText(held!, totalSupply));
      });
      expect([...inModal].sort()).toEqual([...governors].sort());

      // Each share is rounded to 0.01, so the sum is off by at most 0.005 per governor.
      expect(Math.abs(shareSum - 100)).toBeLessThanOrEqual(governors.length * 0.005 + 1e-9);

      // The governor with three units, by name.
      const heavyCard = await list.findInModal(heavy.address);
      await expect(heavyCard).toContainText(heavy.profile!.name);
      await expect(pages.governance.votingPowerChip(heavyCard)).toHaveText(
        `3 / ${totalSupply} · ${percentText(BigInt(3), totalSupply)}%`,
      );
      // One unit is a smaller share than three.
      expect(Number(percentText(BigInt(1), totalSupply))).toBeLessThan(Number(percentText(BigInt(3), totalSupply)));
    },
  );

  test(
    "L4: minting and burning the Governor badge changes every denominator and share after a reload",
    { tag: ["@core", "@owner-tx"] },
    async ({ persona, actor, pages, page, chain, subgraph, wallet }) => {
      // A member who may mint the Governor badge: a holder of its minter badge.
      const [me, newcomer] = await Promise.all([persona("fundedMember"), actor("member")]);
      const minterBadges = await chain.read("getBadgeMinters", [BigInt(GOVERNOR_BADGE)]);
      await chain.mintBadge({ badgeId: minterBadges[0], to: me.address });

      const veteran = (await subgraph.holdersOf(GOVERNOR_BADGE))[0] as Address;
      const veteranUnits = await chain.badgeBalance(veteran, GOVERNOR_BADGE);
      const before = await chain.badgeTotalSupply(GOVERNOR_BADGE);
      const governorsBefore = (await subgraph.holdersOf(GOVERNOR_BADGE)).length;

      const list = pages.governance.governors;
      await pages.governance.open();
      await expect(list.section).toContainText(`Governors (${governorsBefore})`);
      await expect(pages.governance.votingPowerChip(await list.findInModal(veteran))).toHaveText(
        votingPower(veteranUnits, before),
      );

      // Mint one Governor badge to the newcomer, through the app.
      await pages.badge.open(GOVERNOR_BADGE);
      await pages.shell.connect();
      await pages.badge.openMintTab();
      await pages.badge.setMintRecipient(newcomer.address);
      await expect(pages.badge.mintSubmit).toBeEnabled();
      const ownerBalanceBefore = await chain.balance(me.ownerAddress);
      wallet.clearRequests();
      await pages.badge.mintSubmit.click();
      await expect(pages.shell.transactionToast("success")).toBeVisible({ timeout: 60_000 });

      // The owner wallet paid one transaction through the Light Account.
      await expectOwnerPaidThroughAccount({ wallet, chain }, { persona: me, ownerBalanceBefore });
      expect(await chain.badgeTotalSupply(GOVERNOR_BADGE)).toBe(before + BigInt(1));
      expect(await chain.badgeBalance(newcomer.address, GOVERNOR_BADGE)).toBe(BigInt(1));

      // A fresh load of the governance page: one more governor, every
      // denominator is the new supply and the old governor's share is smaller.
      const after = before + BigInt(1);
      await pages.governance.open();
      await expect(list.section).toContainText(`Governors (${governorsBefore + 1})`);
      await expect(pages.governance.votingPowerChip(list.rows.first())).toHaveAttribute("data-total", `${after}`);
      const newcomerCard = await list.findInModal(newcomer.address);
      await expect(newcomerCard).toContainText(newcomer.profile!.name);
      await expect(pages.governance.votingPowerChip(newcomerCard)).toHaveText(votingPower(BigInt(1), after));
      await list.closeModal();
      await expect(pages.governance.votingPowerChip(await list.findInModal(veteran))).toHaveText(
        votingPower(veteranUnits, after),
      );
      expect(votingPower(veteranUnits, after)).not.toBe(votingPower(veteranUnits, before));

      // Burn it again (on chain, as an account that may burn the badge) and reload.
      await chain.burnBadge({ badgeId: GOVERNOR_BADGE, from: newcomer.address });
      expect(await chain.badgeTotalSupply(GOVERNOR_BADGE)).toBe(before);
      await page.reload();
      await expect(list.section).toContainText(`Governors (${governorsBefore})`);
      const remaining = await list.visitModal(async (governor, card) => {
        if (governor !== veteran) return;
        await expect(pages.governance.votingPowerChip(card)).toHaveText(votingPower(veteranUnits, before));
      });
      expect(remaining).toContain(veteran);
      expect(remaining).not.toContain(newcomer.address.toLowerCase());
    },
  );

  test(
    'L5: with no holder of the Governor badge the list says "No governors found"',
    { tag: ["@edge"] },
    async ({ pages, subgraph }) => {
      // The subgraph answers with no holders (an overlay: nothing changes on chain).
      const governors = await subgraph.holdersOf(GOVERNOR_BADGE);
      expect(governors.length).toBeGreaterThan(0);
      await subgraph.overlay(governors.map((governor) => unlink("User", governor, "badges", [GOVERNOR_BADGE])));
      expect(await subgraph.holdersOf(GOVERNOR_BADGE)).toEqual([]);

      await pages.governance.open();
      const list = pages.governance.governors;
      await expect(list.section).toContainText("Governors (0)");
      await expect(pages.governance.emptyState).toBeVisible();
      await expect(list.rows).toHaveCount(0);
      await expect(list.viewAllButton).toHaveCount(0);
      await expect(list.section).not.toContainText(/NaN|%/);
    },
  );

  test(
    "L6: while the total supply is loading a Governor's chip shows the count only, then the share",
    { tag: ["@edge"] },
    async ({ pages, chain, subgraph, network }) => {
      const totalSupply = await chain.badgeTotalSupply(GOVERNOR_BADGE);
      const governors = await subgraph.holdersOf(GOVERNOR_BADGE);
      const loading = network.holdRpc({ method: "eth_call", dataIncludes: TOTAL_SUPPLY_CALL });

      await pages.governance.open();
      const list = pages.governance.governors;
      await expect(list.section).toContainText(`Governors (${governors.length})`);
      const first = (await list.addresses())[0] as Address;
      const units = await chain.badgeBalance(first, GOVERNOR_BADGE);
      const chip = pages.governance.votingPowerChip(list.row(first));

      // The balances are in, the total supply is not: the count alone.
      await expect(chip).toHaveText(`${units}`);
      await expect(chip).not.toHaveAttribute("data-total");
      await expect.poll(() => loading.hits(), "the page asked for the total supply").toBeGreaterThan(0);

      loading.release();
      await expect(chip).toHaveText(votingPower(units, totalSupply));
    },
  );

  test(
    "L6: when the total supply cannot be read every chip shows the count only, never NaN%",
    { tag: ["@edge"] },
    async ({ pages, chain, subgraph, network }) => {
      const governors = await subgraph.holdersOf(GOVERNOR_BADGE);
      const failing = network.failRpc({ method: "eth_call", dataIncludes: TOTAL_SUPPLY_CALL });

      await pages.governance.open();
      const list = pages.governance.governors;
      await expect(list.section).toContainText(`Governors (${governors.length})`);

      const inModal = await list.visitModal(async (governor, card) => {
        const units = await chain.badgeBalance(governor as Address, GOVERNOR_BADGE);
        const chip = pages.governance.votingPowerChip(card);
        await expect(chip).toHaveText(`${units}`);
        await expect(chip).not.toHaveAttribute("data-total");
      });
      expect([...inModal].sort()).toEqual([...governors].sort());
      // The page asked for the total supply and was refused.
      expect(failing.hits()).toBeGreaterThan(0);
      await expect(list.modal).not.toContainText(/NaN|Infinity/);
      await list.closeModal();

      // The cards in the section as well.
      for (const governor of await list.addresses()) {
        const units = await chain.badgeBalance(governor as Address, GOVERNOR_BADGE);
        await expect(pages.governance.votingPowerChip(list.row(governor))).toHaveText(`${units}`);
      }
      await expect(list.section).not.toContainText(/NaN|Infinity/);
    },
  );
});
