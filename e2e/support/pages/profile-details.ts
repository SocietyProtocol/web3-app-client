import type { Locator, Page } from "@playwright/test";

/** "0x1234...abcdef": an address the way the app shortens it (six characters at each end by default). */
export function shortAddress(address: string, length = 6): string {
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * What a profile shows besides its badges, on /profile and on
 * /user/<address>: the page heading, the three numbers at the top, the
 * member's card and the data card next to it. Everything is inside
 * `pages.profile.details` (data-testid="profile-details") except the heading.
 */
export class ProfileDetails {
  constructor(readonly page: Page) {}

  get details(): Locator {
    return this.page.getByTestId("profile-details");
  }

  /** "<name>'s Profile" at the top of the page; an account without a name is headed by its short address. */
  heading(name: string): Locator {
    return this.page.getByRole("heading", { name: `${name}'s Profile`, exact: true });
  }

  /**
   * "Total Balance": the SPEC balance, and under it "held by your wallet
   * 0x12...cdef" (or "held by wallet ...") when the SPEC is on another
   * address than the profile's.
   */
  get balanceStat(): Locator {
    return this.details.getByTestId("account-stat-total-balance");
  }

  /**
   * The line under the balance that names the wallet holding the SPEC: its
   * text is "held by your wallet 0x12...cdef", its title the full address.
   */
  get balanceHolderCaption(): Locator {
    return this.balanceStat.getByText(/held by (your )?wallet/);
  }

  get communitiesStat(): Locator {
    return this.details.getByTestId("account-stat-communities");
  }

  get badgesStat(): Locator {
    return this.details.getByTestId("account-stat-badges");
  }

  /** "Manage referrals", only on the member's own profile. */
  get manageReferralsLink(): Locator {
    return this.details.getByRole("link", { name: "Manage referrals" });
  }

  /** "Edit", only on the member's own profile. */
  get editButton(): Locator {
    return this.details.getByRole("button", { name: "Edit" });
  }

  /** The link to the member who referred this one, under "Referred by". */
  referrerLink(name: string): Locator {
    return this.details.getByRole("link", { name: `User profile link for ${name}` });
  }

  /** The address under "Associated address:", shown in full (matched whatever its case). */
  associatedAddress(address: string): Locator {
    return this.details.getByText(address);
  }

  /** "Go back" above the prompt that replaces the edit form on the wrong network. */
  get guardBackButton(): Locator {
    return this.page.getByRole("button", { name: "Go back" });
  }
}
