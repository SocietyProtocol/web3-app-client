import type { Locator, Page } from "@playwright/test";
import { UserListSection, readAmountChip } from "./user-list";

/** /governance: the Snapshot links and the list of Governors with their voting power. */
export class GovernancePage {
  /** The Governors section: the first cards, "View All Governors" and its modal. */
  readonly governors: UserListSection;

  constructor(readonly page: Page) {
    this.governors = new UserListSection(
      page.getByTestId("governance-governors"),
      page.getByTestId("governance-governors-modal"),
      "governance-governors-row",
      "View All Governors",
    );
  }

  /** Shown in place of the cards when nobody holds the Governor badge. */
  get emptyState(): Locator {
    return this.governors.section.getByText("No governors found");
  }

  async open() {
    await this.page.goto("/governance");
  }

  /** The "n / total · p%" chip on a governor's card (a card from governors.row() or findInModal()). */
  votingPowerChip(card: Locator): Locator {
    return card.getByTestId("governance-voting-power");
  }

  /** The exact numbers behind the chip on a governor's card, and the label as shown. */
  readVotingPower(card: Locator) {
    return readAmountChip(this.votingPowerChip(card));
  }
}
