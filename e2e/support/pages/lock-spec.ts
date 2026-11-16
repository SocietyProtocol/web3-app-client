import type { Locator, Page } from "@playwright/test";

export type LockSpecTabName = "Lock" | "Claim" | "History";
export type TierName = "Bronze" | "Silver" | "Gold";

/** /profile/lock-spec: the Lock, Claim and History tabs behind the page's guard. */
export class LockSpecPage {
  constructor(readonly page: Page) {}

  /** Opens the page, on a tab when one is given (`?tab=claim`). */
  async open(tab?: string) {
    await this.page.goto(tab ? `/profile/lock-spec?tab=${tab}` : "/profile/lock-spec");
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { level: 1, name: "Lock SPEC" });
  }

  tab(name: LockSpecTabName): Locator {
    return this.page.getByRole("tab", { name, exact: true });
  }

  // ---- Lock -------------------------------------------------------------------

  /** "<amount> SPEC" under "Your balance": what the WALLET holds. */
  get balance(): Locator {
    return this.page.getByTestId("lock-spec-balance");
  }

  /** "held by your wallet 0x1234...abcdef". */
  get walletLine(): Locator {
    return this.page.getByText(/^held by your wallet /);
  }

  /** A tier's card: a toggle button that shows the tier's name, its amount and what it gives. */
  tierCard(tier: TierName): Locator {
    return this.page.getByRole("button", { name: new RegExp(`^${tier}\\b`) });
  }

  /** "1Y" to "4Y" in "Time to unlock". */
  duration(years: 1 | 2 | 3 | 4): Locator {
    return this.page.getByRole("button", { name: `${years}Y`, exact: true });
  }

  /** "Insufficient Balance", "Approve and Lock" or "Lock <amount> SPEC". */
  get submit(): Locator {
    return this.page.getByTestId("lock-spec-submit");
  }

  /** Plan, amount, lock duration and unlock date of what is selected. */
  get summary(): Locator {
    return this.page.getByTestId("lock-spec-summary");
  }

  get simulationError(): Locator {
    return this.page.getByTestId("transaction-simulation-error");
  }

  // ---- Claim ------------------------------------------------------------------

  /** Locked balance, unlock date, status and the claim button. */
  get claim(): Locator {
    return this.page.getByTestId("lock-spec-claim");
  }

  /** "CLAIM SPEC", "Wait until lock period is over" or "CLAIM <amount> SPEC". */
  get claimSubmit(): Locator {
    return this.page.getByTestId("lock-spec-claim-submit");
  }

  // ---- History ----------------------------------------------------------------

  get historyRows(): Locator {
    return this.page.getByTestId("lock-spec-history-row");
  }

  get historyEmpty(): Locator {
    return this.page.getByText("No lock activity found.");
  }

  /** The row's link to the transaction on the block explorer. */
  historyExplorerLink(row: Locator): Locator {
    return row.getByRole("link", { name: "View on explorer" });
  }
}
