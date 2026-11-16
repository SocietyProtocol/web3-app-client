import type { Locator, Page } from "@playwright/test";

/**
 * /auction: the "Coming soon" page of a build without an auction id, the
 * inactive view, and the running auction with its numbers, the bid form
 * and "Your Bids". Also the auction's status chip in the sidebar, which is
 * on every page.
 */
export class AuctionPage {
  constructor(readonly page: Page) {}

  async open() {
    await this.page.goto("/auction");
  }

  /** "SPEC ICO Auction" without an auction id, "SPEC Token Auction" with one. */
  get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  /** The bubble of a build that has no auction id. */
  get comingSoon(): Locator {
    return this.page.getByText("Coming soon", { exact: true });
  }

  /** "Active", "Inactive" or "Ended" next to "Auction" in the expanded sidebar. */
  get statusChip(): Locator {
    return this.page.getByTestId("auction-status-chip");
  }

  /** "<network> - Auction id #<n>" under the heading; only the running auction has it. */
  get auctionIdLine(): Locator {
    return this.page.getByText(/ - Auction id #\d+$/);
  }

  /** The countdown: "ENDS IN" on the running auction, "The auction kicks off on ...!" on the inactive view. */
  get countdown(): Locator {
    return this.page.getByRole("timer", { name: "Auction end countdown timer" });
  }

  /** One cell of the countdown, by its accessible name: "02 days", "03 hours". */
  countdownCell(name: string | RegExp): Locator {
    return this.countdown.getByLabel(name);
  }

  /** A number of the running auction with its label: "Current Clearing Price", "Bidding With", "Total Auctioned", "Min Price". */
  stat(label: string): Locator {
    return this.page.getByTestId("auction-stat").filter({ hasText: label });
  }

  /** The reference line's label in the price / volume chart: "Clearing Price: 0.75 USDC". */
  get chartClearingPriceLabel(): Locator {
    return this.page.getByText(/^Clearing Price: /).first();
  }

  get chartVolumeAxisLabel(): Locator {
    return this.page.getByText("Volume (SPEC)", { exact: true });
  }

  // ---- the bid form ---------------------------------------------------------

  /** The form itself. Logged out or on the wrong network a prompt stands in its place. */
  get bidForm(): Locator {
    return this.page.getByTestId("auction-bid-form");
  }

  /** The "Amount" field with its helper text. */
  get amountField(): Locator {
    return this.page.getByTestId("auction-bid-amount");
  }

  get amountInput(): Locator {
    return this.amountField.getByRole("textbox");
  }

  /** The "<bidding token> Per <auctioned token> price" field with its helper text. */
  get priceField(): Locator {
    return this.page.getByTestId("auction-bid-price");
  }

  get priceInput(): Locator {
    return this.priceField.getByRole("textbox");
  }

  /** "Approve", "Place Bid" or "Bid Placed!", and what it says while it works ("Simulating...", "Approving..."). */
  get submit(): Locator {
    return this.page.getByTestId("auction-bid-submit");
  }

  /** "Approval confirmed" / "Bid placed successfully!" under the button. */
  get feedback(): Locator {
    return this.bidForm.getByTestId("transaction-feedback-success");
  }

  get simulationError(): Locator {
    return this.bidForm.getByTestId("transaction-simulation-error");
  }

  /** Types an amount and a price and leaves the form, which is when it validates. */
  async fillBid(amount: string, price: string) {
    await this.amountInput.fill(amount);
    await this.priceInput.fill(price);
    await this.priceInput.blur();
  }

  // ---- Your Bids --------------------------------------------------------------

  /** The list under the form. Not rendered while logged out. */
  get yourBids(): Locator {
    return this.page.getByTestId("auction-your-bids");
  }

  get noBids(): Locator {
    return this.yourBids.getByText("No bids found.");
  }

  get bidRows(): Locator {
    return this.yourBids.getByTestId("auction-bid-row");
  }

  /** The row of a bid, by a text it shows (its amount: "150 USDC"). */
  bidRow(text: string | RegExp): Locator {
    return this.bidRows.filter({ hasText: text });
  }

  cancelButton(row: Locator): Locator {
    return row.getByTestId("auction-bid-cancel");
  }

  /**
   * The wrapper that carries the Cancel button's tooltip. A disabled button
   * takes no pointer events, so this is what a test hovers; the tooltip's
   * text is also its accessible name.
   */
  cancelTooltipAnchor(row: Locator, tooltip: string): Locator {
    return row.getByLabel(tooltip, { exact: true });
  }
}
