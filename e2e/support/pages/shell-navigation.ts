import type { APIRequestContext, Locator, Page } from "@playwright/test";

/** The sidebar's entries, in the order they are listed, with the page each one opens. */
export const SIDEBAR_ITEMS = [
  { text: "Home", path: "/" },
  { text: "Profile", path: "/profile" },
  { text: "Accounts", path: "/accounts" },
  { text: "Badges", path: "/badges" },
  { text: "SPEC Token", path: "/spec-token" },
  { text: "Governance", path: "/governance" },
  { text: "Communities", path: "/communities" },
  { text: "Auction", path: "/auction" },
] as const;

export type SidebarItemText = (typeof SIDEBAR_ITEMS)[number]["text"];

/**
 * The parts of the app shell that are not about the wallet: the sidebar
 * (a permanent one from 900px up, a drawer below), the footer, the home
 * page and the pages that only show copy.
 *
 * The sidebar's entries are in the document twice from 900px up (the
 * drawer stays mounted, hidden), so every sidebar locator here only finds
 * what is on screen.
 */
export class ShellNavigationPage {
  constructor(readonly page: Page) {}

  // ---- sidebar ---------------------------------------------------------------

  /** The sidebar entries that are on screen: none while the drawer is closed on a phone. */
  get sidebarItems(): Locator {
    return this.page.getByTestId("shell-nav-item").filter({ visible: true });
  }

  /** One entry of the sidebar, by its label. */
  sidebarItem(text: SidebarItemText): Locator {
    return this.sidebarItems.filter({ has: this.page.getByText(text, { exact: true }) });
  }

  /** The link of an entry: what a click on it follows. */
  sidebarLink(text: SidebarItemText): Locator {
    return this.sidebarItem(text).getByRole("link");
  }

  /**
   * The entry's label: the element that carries the opacity, not the text
   * span inside it (opacity is not inherited as a computed value). It stays
   * in the document when the sidebar is collapsed, with opacity 0.
   */
  sidebarLabel(text: SidebarItemText): Locator {
    return this.sidebarItem(text).getByTestId("shell-nav-label");
  }

  /** At the bottom of an expanded sidebar; in the phone drawer it closes the drawer. */
  get collapseButton(): Locator {
    return this.page.getByRole("button", { name: "Collapse sidebar" });
  }

  /** At the bottom of a collapsed sidebar. */
  get expandButton(): Locator {
    return this.page.getByRole("button", { name: "Expand sidebar" });
  }

  /** Width in pixels of an entry on screen: 86 minus padding when collapsed, 312 minus padding when expanded. */
  async sidebarItemWidth(text: SidebarItemText): Promise<number> {
    return (await this.sidebarItem(text).boundingBox())?.width ?? 0;
  }

  // ---- header and footer -----------------------------------------------------

  /** The logo in the header: a link to the home page. */
  get headerLogoLink(): Locator {
    return this.page.getByRole("banner").getByRole("link", { name: "Society Protocol Home" });
  }

  get footer(): Locator {
    return this.page.getByTestId("shell-footer");
  }

  /**
   * The Society Protocol links that are on screen: in the header from 900px
   * up, in the open drawer below. The drawer's copy stays in the document
   * (hidden) at every width.
   */
  get socialLinks(): Locator {
    return this.page.getByTestId("shell-social-links").filter({ visible: true });
  }

  /** The header's own group of links, on screen or not. */
  get headerSocialLinks(): Locator {
    return this.page.getByRole("banner").getByTestId("shell-social-links");
  }

  /** One link of the visible group: website, forum, youtube, discord or x. */
  socialLink(id: string): Locator {
    return this.socialLinks.getByTestId(`shell-social-link-${id}`);
  }

  /** The docs banner at the bottom of the sidebar that is on screen. */
  get docsBanner(): Locator {
    return this.page.getByTestId("shell-docs-banner").filter({ visible: true });
  }

  /** The page's own content, without header, sidebar and footer. */
  get main(): Locator {
    return this.page.getByRole("main");
  }

  /** The page's top heading. */
  heading(name: string | RegExp): Locator {
    return this.main.getByRole("heading", { level: 1, name, exact: true });
  }

  // ---- home ------------------------------------------------------------------

  get homeHeading(): Locator {
    return this.heading("Your permanent place in the Society Protocol movement.");
  }

  /** The title of one of the home page's cards ("Build your identity", "Earn badges", ...). */
  homeCardTitle(title: string): Locator {
    return this.main.getByRole("heading", { level: 3, name: title, exact: true });
  }

  /** The button of a home card, by its label ("Badges", "Communities", "GOVERNANCE", "Fundraiser"). */
  homeCardButton(label: string): Locator {
    return this.main.getByRole("button", { name: label, exact: true });
  }

  /** "Connect Wallet" on the identity card (logged out). The header has one of its own. */
  get homeConnectButton(): Locator {
    return this.main.getByTestId("wallet-connect");
  }

  /** On the identity card of a connected wallet that has no profile. */
  get claimAccountButton(): Locator {
    return this.main.getByRole("button", { name: "Claim your account", exact: true });
  }

  /** On the identity card of a member. */
  get checkProfileButton(): Locator {
    return this.main.getByRole("button", { name: "Check your profile", exact: true });
  }

  /** The card next to "What is this?" when the build has no hero video. */
  get welcomeCard(): Locator {
    return this.main.getByRole("heading", { level: 2, name: "Welcome", exact: true });
  }

  /** The card that replaces the Welcome card when NEXT_PUBLIC_HERO_VIDEO_URL is set. */
  get heroVideoCard(): Locator {
    return this.main.getByRole("button", { name: /^Play ".+" video$/ });
  }

  // ---- copy that is loaded from /api/copywriting -----------------------------

  /** The questions of an FAQ that are closed: every one of them until one is clicked. */
  get closedQuestions(): Locator {
    return this.main.getByRole("button", { expanded: false });
  }

  /** A question of an FAQ: the header of a collapsible entry. */
  question(text: string): Locator {
    return this.main.getByRole("button", { name: text, exact: true });
  }

  /** What a markdown block shows when its copy could not be loaded. */
  get copyLoadError(): Locator {
    return this.main.getByText("Failed to load content.", { exact: true });
  }

  // ---- /spec-token -----------------------------------------------------------

  /** The "SPEC Token Distribution" card: the pie, its centre and the legend. */
  get distributionChart(): Locator {
    return this.page.getByTestId("spec-token-chart");
  }

  /** The middle of the pie: the total supply, or the share that was picked. */
  get distributionChartCenter(): Locator {
    return this.page.getByTestId("spec-token-chart-center");
  }

  /** The legend's rows; each is a button that picks its share. */
  get distributionLegend(): Locator {
    return this.distributionChart.getByRole("listitem");
  }

  distributionLegendButton(label: string): Locator {
    return this.distributionChart.getByRole("button", { name: new RegExp(`^${label}\\s*\\d+%$`) });
  }
}

/**
 * The copy behind a markdown block, as the app's own route serves it, and
 * the questions (<summary> elements) in it as plain text.
 */
export async function readCopy(api: APIRequestContext, slug: string): Promise<{ markdown: string; questions: string[] }> {
  const response = await api.get(`/api/copywriting/${slug}`);
  if (!response.ok()) throw new Error(`/api/copywriting/${slug} answered ${response.status()}`);
  const markdown = await response.text();
  const questions = [...markdown.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
  return { markdown, questions };
}
