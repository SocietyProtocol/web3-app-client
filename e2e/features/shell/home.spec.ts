import { URLS as APP_URLS } from "../../../src/consts/urls";
import { expect, test } from "../../fixtures";
import { ShellNavigationPage, readCopy } from "../../support/pages/shell-navigation";

/**
 * The home page: hero, the identity card (whose button depends on who is
 * connected), the feature cards and the FAQ.
 *
 * The suite's build has no hero video (NEXT_PUBLIC_HERO_VIDEO_URL is empty
 * in support/stack/config.mjs), so the Welcome card is what these tests see.
 */

const LEARN_MORE_URL = "https://societyprotocol.io/articles/how-we-are-building-society-protocol/";

/** The cards under the hero, in the order they are shown. */
const CARD_TITLES = [
  "Build your identity",
  "Earn badges",
  "Join communities",
  "Govern the movement",
  "Participate in the fundraise",
  "WHY NOW?",
];

/** The feature cards that lead somewhere: button label, destination and that page's top heading. */
const CARD_ROUTES = [
  { button: "Badges", path: "/badges", heading: "Badges" },
  { button: "Communities", path: "/communities", heading: "Communities" },
  { button: "GOVERNANCE", path: "/governance", heading: "Governance" },
  { button: "Fundraiser", path: "/auction", heading: "SPEC ICO Auction" },
];

/**
 * The errors that are the app's own. The hermetic network aborts every
 * request that would leave the machine (WalletConnect, analytics, fonts),
 * and the browser logs each of those as a console error: they are left out.
 * An uncaught exception always counts.
 */
function appErrors(errors: string[], blocked: string[]): string[] {
  const blockedHosts = new Set<string>();
  for (const url of blocked) {
    try {
      blockedHosts.add(new URL(url).host);
    } catch {
      // not a URL: nothing to match against
    }
  }
  return errors.filter((error) => {
    if (error.startsWith("pageerror:")) return true;
    if (error.includes("net::ERR_BLOCKED_BY_CLIENT")) return false;
    return ![...blockedHosts].some((host) => error.includes(host));
  });
}

/**
 * The first words of the first answer in an FAQ's markdown: the plain text
 * after the first </summary>, up to the first piece of markup.
 */
function firstAnswerOpening(markdown: string): string {
  const afterSummary = markdown.split("</summary>")[1] ?? "";
  const line = afterSummary.split("\n").find((text) => text.trim().length > 0) ?? "";
  return line.trim().split(/[[*_<`]/)[0].trim().slice(0, 60);
}

test.describe("home", () => {
  test(
    "A1: the home page shows the hero, the identity card with Connect and the feature cards, without errors",
    { tag: ["@smoke"] },
    async ({ page, pages, wallet, network, browserErrors }) => {
      const nav = new ShellNavigationPage(page);
      const response = await page.goto("/");
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle("Society Protocol");

      // Hero.
      await expect(nav.homeHeading).toBeVisible();
      await expect(nav.main.getByText("What is this?", { exact: true })).toBeVisible();

      // The cards, in order.
      for (const title of CARD_TITLES) await expect(nav.homeCardTitle(title)).toBeVisible();

      // Logged out: the identity card offers to connect, and nothing else.
      await expect(nav.homeConnectButton).toBeVisible();
      await expect(nav.homeConnectButton).toHaveText(/^Connect\s+Wallet$/);
      await expect(nav.claimAccountButton).toHaveCount(0);
      await expect(nav.checkProfileButton).toHaveCount(0);
      await expect(nav.main.getByRole("link", { name: "MetaMask", exact: true })).toHaveAttribute(
        "href",
        "https://metamask.io/download/",
      );
      await expect(pages.shell.connectButton).toBeVisible();
      for (const { button } of CARD_ROUTES) await expect(nav.homeCardButton(button)).toBeVisible();

      // The FAQ under the cards has loaded: everything the page fetches on
      // its own has had its chance to fail.
      await expect(nav.main.getByRole("heading", { level: 2, name: "Common Questions", exact: true })).toBeVisible();
      await expect(nav.closedQuestions).not.toHaveCount(0);
      await expect(nav.copyLoadError).toHaveCount(0);

      // The card's button opens the wallet picker, like the header's.
      await nav.homeConnectButton.click();
      await expect(pages.shell.walletOption).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(pages.shell.walletOption).toBeHidden();

      // Looking at the page asked the wallet for nothing.
      expect(wallet.isConnected).toBe(false);
      expect(wallet.requestsOf("eth_requestAccounts")).toHaveLength(0);
      expect(appErrors(browserErrors, network.blocked), "errors of the page itself").toEqual([]);
    },
  );

  test(
    "A4: the feature cards lead to Badges, Communities, Governance and the auction",
    { tag: ["@core"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      for (const { button, path, heading } of CARD_ROUTES) {
        await page.goto("/");
        await nav.homeCardButton(button).click();
        await expect(page, `"${button}" goes to ${path}`).toHaveURL((url) => url.pathname === path);
        await expect(nav.heading(heading)).toBeVisible();
      }
    },
  );

  test(
    "A5: the home FAQ is loaded from /api/copywriting and its answers open on a click",
    { tag: ["@core"] },
    async ({ page, api }) => {
      const nav = new ShellNavigationPage(page);
      const copy = await readCopy(api, "home-faqs");
      expect(copy.questions.length, "questions in the served copy").toBeGreaterThan(0);
      const answer = firstAnswerOpening(copy.markdown);
      expect(answer.length, "an answer to look for").toBeGreaterThan(10);

      const loaded = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/copywriting/home-faqs");
      await page.goto("/");
      const response = await loaded;
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/markdown");

      // Every question of the served copy is on the page, and nothing else is
      // an FAQ entry: the page renders the route's answer, not a copy of it.
      for (const question of copy.questions) await expect(nav.question(question)).toBeVisible();
      await expect(nav.closedQuestions).toHaveCount(copy.questions.length);
      await expect(nav.copyLoadError).toHaveCount(0);

      // Answers are closed until their question is clicked.
      const first = nav.question(copy.questions[0]);
      await expect(first).toHaveAttribute("aria-expanded", "false");
      await expect(nav.main.getByText(answer)).toBeHidden();
      await first.click();
      await expect(first).toHaveAttribute("aria-expanded", "true");
      await expect(nav.main.getByText(answer)).toBeVisible();
      await first.click();
      await expect(first).toHaveAttribute("aria-expanded", "false");
      await expect(nav.main.getByText(answer)).toBeHidden();

      // "What is this?", next to the hero card.
      await expect(nav.main.getByText("What is this?", { exact: true })).toBeVisible();
      await expect(nav.main.getByText("The Web3 Outpost is the first step.", { exact: true })).toBeVisible();
    },
  );

  test(
    "A5: \"What is this?\" is loaded from /api/copywriting",
    { tag: ["@core"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      const slugs: string[] = [];
      page.on("request", (request) => {
        const { pathname } = new URL(request.url());
        if (pathname.startsWith("/api/copywriting/")) slugs.push(pathname.slice("/api/copywriting/".length));
      });
      await page.goto("/");
      await expect(nav.main.getByText("What is this?", { exact: true })).toBeVisible();
      // The FAQ's copy has arrived, so the page's requests for copy have been made.
      await expect(nav.closedQuestions).not.toHaveCount(0);
      expect(slugs).toContain("home-faqs");

      // The scenario says this block is markdown from /api/copywriting. The
      // home page (src/components/Home/Home.tsx) holds its three paragraphs as
      // text in the component and fetches only the FAQ; the "general-info"
      // copy the route still serves is used by no page. Either the scenario
      // is out of date or the block was meant to be editable copy: that is
      // the owner's decision, and it is not counted as an app bug until then.
      // So the rest is fixme (skipped), not an expected failure. If the block
      // becomes copy from the route, remove the fixme and the timeout; if the
      // scenario is out of date, remove this half and change the A5 row.
      test.fixme(true, "owner to decide: \"What is this?\" is text in Home.tsx, the scenario says copy from /api/copywriting");
      await expect
        .poll(() => slugs.filter((slug) => slug !== "home-faqs"), { timeout: 5_000 })
        .not.toEqual([]);
    },
  );

  test(
    "A5: an FAQ that cannot be loaded says so and leaves the rest of the page standing",
    { tag: ["@edge"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      await page.route("**/api/copywriting/home-faqs", (route) => route.fulfill({ status: 500, body: "broken" }));
      await page.goto("/");
      await expect(nav.copyLoadError).toBeVisible();
      await expect(nav.homeHeading).toBeVisible();
      await expect(nav.main.getByRole("heading", { level: 2, name: "Common Questions", exact: true })).toBeVisible();
      for (const title of CARD_TITLES) await expect(nav.homeCardTitle(title)).toBeVisible();
    },
  );

  test(
    "A8: a connected wallet without a profile is offered \"Claim your account\", which opens the setup wizard",
    { tag: ["@core"] },
    async ({ page, persona, pages, wallet, chain }) => {
      const nav = new ShellNavigationPage(page);
      const me = await persona("new");
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));

      await page.goto("/");
      await pages.shell.connect();
      await expect(nav.claimAccountButton).toBeVisible();
      await expect(nav.homeConnectButton).toHaveCount(0);
      await expect(nav.checkProfileButton).toHaveCount(0);

      await nav.claimAccountButton.click();
      await expect(page).toHaveURL((url) => url.pathname === "/profile" && url.searchParams.get("setupOpen") === "true");
      // Straight into the wizard's first step, not the "Setup your Account" prompt.
      await expect(pages.onboarding.form).toBeVisible();
      await expect(pages.onboarding.nameInput).toBeVisible();
      await expect(pages.onboarding.setupPrompt).toBeHidden();

      // Getting there is navigation only.
      expect(wallet.signatureRequests()).toHaveLength(0);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
      expect(await chain.profileBadgeId(me.address)).toBe(BigInt(0));
    },
  );

  test(
    "A9: a member is offered \"Check your profile\", which opens the profile",
    { tag: ["@core"] },
    async ({ page, persona, pages, chain }) => {
      const nav = new ShellNavigationPage(page);
      const me = await persona("member");
      expect(await chain.profileBadgeId(me.address)).toBe(me.profile!.badgeId);

      await page.goto("/");
      await pages.shell.connect();
      // The header knows the member: the profile has been read.
      await expect(pages.shell.accountButton).toContainText(me.profile!.name);
      await expect(nav.checkProfileButton).toBeVisible();
      await expect(nav.homeConnectButton).toHaveCount(0);
      await expect(nav.claimAccountButton).toHaveCount(0);

      await nav.checkProfileButton.click();
      await expect(page).toHaveURL((url) => url.pathname === "/profile" && !url.searchParams.has("setupOpen"));
      await expect(pages.profile.details).toBeVisible();
      await expect(nav.heading(`${me.profile!.name}'s Profile`)).toBeVisible();
      await expect(pages.onboarding.setupPrompt).toBeHidden();
    },
  );

  test(
    "A9: a member is not offered \"Claim your account\" while the wallet is still being read",
    { tag: ["@edge"] },
    async ({ page, persona, pages, network }) => {
      const nav = new ShellNavigationPage(page);
      const me = await persona("member");
      // The app reads the wallet's code to decide which identity applies.
      // Keep that read open: this is the moment right after connecting.
      const codeRead = network.holdRpc({ method: "eth_getCode" });

      await page.goto("/");
      await pages.shell.connectButton.click();
      await pages.shell.walletOption.click();
      await expect.poll(() => codeRead.hits()).toBeGreaterThan(0);
      await expect(nav.homeConnectButton).toHaveCount(0);

      // While the code is read, useOutpostAccount reports a connected wallet
      // without an address. Home.tsx then asks useProfileId(undefined), a
      // disabled query that is not "loading" and has no data, and takes that
      // for "no profile": the card shows "Claim your account" to a member
      // until the read returns. Remove the timeout together with test.fail.
      test.fail(true, "the identity card shows \"Claim your account\" to everyone until eth_getCode returns");
      await expect(nav.claimAccountButton).toHaveCount(0, { timeout: 2_000 });

      codeRead.release();
      await expect(pages.shell.accountButton).toContainText(me.profile!.name);
      await expect(nav.checkProfileButton).toBeVisible();
    },
  );

  test(
    "A10: without a hero video the Welcome card stands next to \"What is this?\"",
    { tag: ["@edge"] },
    async ({ page, network }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(nav.homeHeading).toBeVisible();
      await expect(nav.welcomeCard).toBeVisible();
      await expect(
        nav.main.getByText("We're building the coordination layer for a new kind of society.", { exact: true }),
      ).toBeVisible();
      await expect(nav.heroVideoCard).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Close video" })).toHaveCount(0);
      // No video is fetched either (the FAQ has loaded, so the page is done fetching).
      await expect(nav.closedQuestions).not.toHaveCount(0);
      expect(network.blocked.filter((url) => /\.mp4(\?|#|$)/.test(url))).toEqual([]);
    },
  );

  test(
    "A11: the header logo leads home, the footer names Society Protocol, and links that leave the app open a new tab",
    { tag: ["@edge"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/badges");
      await expect(nav.heading("Badges")).toBeVisible();

      // Footer: on every page, under the content.
      await expect(nav.footer).toBeVisible();
      await expect(nav.footer.getByRole("img", { name: "Society Protocol Logo" })).toBeVisible();
      await expect(nav.footer).toContainText(`Society Protocol ${new Date().getFullYear()}`);

      // Header logo.
      await expect(nav.headerLogoLink).toHaveAttribute("href", "/");
      await expect(nav.headerLogoLink.getByRole("img", { name: "Society Protocol Logo" })).toBeVisible();
      await nav.headerLogoLink.click();
      await expect(page).toHaveURL((url) => url.pathname === "/");
      await expect(nav.homeHeading).toBeVisible();
      await expect(nav.footer).toContainText(`Society Protocol ${new Date().getFullYear()}`);

      // Links out of the app never replace it.
      const external = [
        { link: nav.main.getByRole("link", { name: "Learn about Society Protocol" }), href: LEARN_MORE_URL },
        { link: nav.main.getByRole("link", { name: "MetaMask", exact: true }), href: "https://metamask.io/download/" },
      ];
      for (const { link, href } of external) {
        await expect(link).toHaveAttribute("href", href);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", /noopener/);
      }
    },
  );

  test(
    "A11: the footer links to X and Discord in a new tab",
    { tag: ["@edge"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(nav.footer).toBeVisible();

      // The scenario expects X and Discord links in the shell. The footer
      // (src/components/Footer/Footer.tsx) holds a logo and the year only;
      // the two links exist on a community's Governance tab and nowhere in
      // the header, sidebar or footer. A feature the app never had is not an
      // app bug: whether the shell should have the links is the owner's
      // decision, so the rest is fixme (skipped) until then. Remove the
      // fixme and the timeouts if the links are added; drop the test and
      // change the A11 row if not.
      test.fixme(true, "owner to decide: the scenario expects X and Discord links in the shell, which never had them");
      for (const href of [APP_URLS.TWITTER, APP_URLS.DISCORD]) {
        const link = nav.footer.locator(`a[href="${href}"]`);
        await expect(link).toBeVisible({ timeout: 2_000 });
        await expect(link).toHaveAttribute("target", "_blank", { timeout: 2_000 });
      }
    },
  );
});
