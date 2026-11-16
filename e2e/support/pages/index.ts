import type { Page } from "@playwright/test";
import { AccountsPage } from "./accounts-directory";
import { AuctionPage } from "./auction";
import { BadgePage } from "./badge";
import { BadgeActionsPanel } from "./badge-actions";
import { BadgeCreatePage } from "./badge-create";
import { BadgeEditForm } from "./badge-create-edit";
import { BadgeCreateForm } from "./badge-create-form";
import { BadgeDetailPanel } from "./badges-detail";
import { BadgesListPage } from "./badges-list";
import { CommunitiesPage } from "./communities";
import { CommunityCreatePage } from "./communities-create";
import { CommunityDetailPage } from "./community-detail";
import { ConnectWalletPage } from "./connect-wallet";
import { GovernancePage } from "./governance";
import { GovernanceContent } from "./governance-content";
import { LockSpecPage } from "./lock-spec";
import { OnboardingPage } from "./onboarding";
import { ProfilePage } from "./profile";
import { ProfileDetails } from "./profile-details";
import { ReferralsPage } from "./referrals";
import { ShellPage } from "./shell";
import { ShellNavigationPage } from "./shell-navigation";

/**
 * Page objects, one per feature area. Keep them thin: locators and the
 * few multi-step actions every test of the area repeats. Assertions about
 * behaviour belong in the specs.
 *
 * Every page object but the shell takes only the page, so a spec may also
 * build one itself (`new AccountsPage(page)`); `pages.<name>` is the same
 * thing, ready made.
 */
export type Pages = {
  /** Header, toasts, notices and the connect flow. */
  shell: ShellPage;
  /** Sidebar, phone drawer, footer and the static pages. */
  navigation: ShellNavigationPage;
  /** The account menu, the wallet picker and the wrong-network prompt. */
  connectWallet: ConnectWalletPage;
  onboarding: OnboardingPage;
  profile: ProfilePage;
  /** The profile card's stats, referrer and associated addresses, on /profile and /user/<address>. */
  profileDetails: ProfileDetails;
  referrals: ReferralsPage;
  accounts: AccountsPage;
  badge: BadgePage;
  badgesList: BadgesListPage;
  badgeDetail: BadgeDetailPanel;
  badgeActions: BadgeActionsPanel;
  /** The create-badge wizard: BadgeCreatePage plus the rest of the form. */
  badgeCreate: BadgeCreateForm;
  badgeEdit: BadgeEditForm;
  communities: CommunitiesPage;
  communityCreate: CommunityCreatePage;
  communityDetail: CommunityDetailPage;
  governance: GovernancePage;
  /** The text, links and Snapshot buttons of /governance. */
  governanceContent: GovernanceContent;
  auction: AuctionPage;
  lockSpec: LockSpecPage;
};

export function createPages(page: Page, options: { walletPickerTestId: string }): Pages {
  return {
    shell: new ShellPage(page, options.walletPickerTestId),
    navigation: new ShellNavigationPage(page),
    connectWallet: new ConnectWalletPage(page),
    onboarding: new OnboardingPage(page),
    profile: new ProfilePage(page),
    profileDetails: new ProfileDetails(page),
    referrals: new ReferralsPage(page),
    accounts: new AccountsPage(page),
    badge: new BadgePage(page),
    badgesList: new BadgesListPage(page),
    badgeDetail: new BadgeDetailPanel(page),
    badgeActions: new BadgeActionsPanel(page),
    badgeCreate: new BadgeCreateForm(page),
    badgeEdit: new BadgeEditForm(page),
    communities: new CommunitiesPage(page),
    communityCreate: new CommunityCreatePage(page),
    communityDetail: new CommunityDetailPage(page),
    governance: new GovernancePage(page),
    governanceContent: new GovernanceContent(page),
    auction: new AuctionPage(page),
    lockSpec: new LockSpecPage(page),
  };
}

export { BadgeCreatePage, BadgePage, GovernancePage, OnboardingPage, ProfilePage, ShellPage };
