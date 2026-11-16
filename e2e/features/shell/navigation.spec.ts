import type { Page } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { SIDEBAR_ITEMS, ShellNavigationPage, type SidebarItemText } from "../../support/pages/shell-navigation";

/**
 * The sidebar (a permanent one from 900px up, a drawer below) and the page
 * for an address that does not exist. All logged out.
 */

/** What tells each destination apart: the tab's title and the page's top heading (none on /profile, logged out). */
const DESTINATIONS: Record<SidebarItemText, { title: string; heading?: string }> = {
  Home: { title: "Society Protocol", heading: "Your permanent place in the Society Protocol movement." },
  Profile: { title: "Profile | Society Protocol" },
  Accounts: { title: "Accounts | Society Protocol", heading: "Accounts" },
  Badges: { title: "Badges | Society Protocol", heading: "Badges" },
  "SPEC Token": { title: "SPEC Token | Society Protocol", heading: "SPEC Token" },
  Governance: { title: "Governance | Society Protocol", heading: "Governance" },
  Communities: { title: "Communities | Society Protocol", heading: "Communities" },
  // The suite's build has no auction id, so /auction is the "Coming soon" page.
  Auction: { title: "SPEC Token Auction | Society Protocol", heading: "SPEC ICO Auction" },
};

/** Marks the loaded document, to tell a navigation inside the app from a full page load. */
async function markDocument(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __e2eSameDocument?: boolean }).__e2eSameDocument = true;
  });
}

function isSameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { __e2eSameDocument?: boolean }).__e2eSameDocument === true);
}

test.describe("navigation", () => {
  test(
    "A2: each of the sidebar's eight entries opens its page",
    { tag: ["@smoke"] },
    async ({ page, pages }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(nav.homeHeading).toBeVisible();

      // Exactly these eight, in this order.
      await expect(nav.sidebarItems).toHaveCount(SIDEBAR_ITEMS.length);
      await expect(nav.sidebarItems).toHaveText(SIDEBAR_ITEMS.map(({ text }) => new RegExp(`^${text}`)));
      for (const { text, path } of SIDEBAR_ITEMS) {
        await expect(nav.sidebarLink(text)).toHaveAttribute("href", path);
      }

      await markDocument(page);
      // Home last: by then it is a navigation, not the page the test started on.
      const order = [...SIDEBAR_ITEMS.slice(1), SIDEBAR_ITEMS[0]];
      for (const { text, path } of order) {
        const { title, heading } = DESTINATIONS[text];
        await nav.sidebarLink(text).click();
        await expect(page, `"${text}" goes to ${path}`).toHaveURL((url) => url.pathname === path);
        await expect(page).toHaveTitle(title);
        if (heading) await expect(nav.heading(heading)).toBeVisible();
        // The shell stays: header, sidebar and footer are not rebuilt.
        await expect(nav.sidebarItems).toHaveCount(SIDEBAR_ITEMS.length);
        await expect(nav.headerLogoLink).toBeVisible();

        if (text === "Profile") {
          // Logged out, the profile page asks for a wallet.
          await expect(pages.shell.connectPrompt).toBeVisible();
        }
        if (text === "Auction") {
          await expect(nav.main.getByText("Coming soon", { exact: true })).toBeVisible();
        }
      }
      expect(await isSameDocument(page), "the sidebar navigates inside the app, without reloading it").toBe(true);
    },
  );

  test(
    "A3: the sidebar collapses to icons and expands again, and still navigates while collapsed",
    { tag: ["@core"] },
    async ({ page, pages }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");

      // Expanded from the start on a wide screen; the phone's menu button is not there.
      await expect(nav.collapseButton).toBeVisible();
      await expect(pages.shell.menuButton).toBeHidden();
      await expect(nav.sidebarItems).toHaveCount(SIDEBAR_ITEMS.length);
      await expect(nav.sidebarLabel("Badges")).toHaveCSS("opacity", "1");
      await expect.poll(() => nav.sidebarItemWidth("Badges")).toBeGreaterThan(200);

      await nav.collapseButton.click();
      await expect(nav.expandButton).toBeVisible();
      await expect(nav.collapseButton).toHaveCount(0);
      await expect(page.getByText("Collapse", { exact: true }).filter({ visible: true })).toHaveCount(0);
      // Icons only: the labels fade out and the entries shrink to the icon column.
      await expect(nav.sidebarLabel("Badges")).toHaveCSS("opacity", "0");
      await expect.poll(() => nav.sidebarItemWidth("Badges")).toBeLessThan(100);
      await expect(nav.sidebarItems).toHaveCount(SIDEBAR_ITEMS.length);

      // A collapsed entry names itself on hover, and still navigates.
      await nav.sidebarItem("Accounts").hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "Accounts" })).toBeVisible();
      await nav.sidebarLink("Badges").click();
      await expect(page).toHaveURL((url) => url.pathname === "/badges");
      await expect(nav.heading("Badges")).toBeVisible();
      // The choice survives the navigation.
      await expect(nav.expandButton).toBeVisible();
      await expect.poll(() => nav.sidebarItemWidth("Badges")).toBeLessThan(100);

      await nav.expandButton.click();
      await expect(nav.collapseButton).toBeVisible();
      await expect(nav.sidebarLabel("Badges")).toHaveCSS("opacity", "1");
      await expect.poll(() => nav.sidebarItemWidth("Badges")).toBeGreaterThan(200);
    },
  );

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test(
      "A3: the menu button opens the drawer; Escape, a navigation and its own button close it",
      { tag: ["@core"] },
      async ({ page, pages }) => {
        const nav = new ShellNavigationPage(page);
        await page.goto("/");
        await expect(nav.homeHeading).toBeVisible();

        // Closed at first: the menu button is the only way in.
        await expect(pages.shell.menuButton).toBeVisible();
        await expect(nav.sidebarItems).toHaveCount(0);

        await pages.shell.menuButton.click();
        await expect(nav.sidebarItems).toHaveCount(SIDEBAR_ITEMS.length);
        for (const { text, path } of SIDEBAR_ITEMS) {
          await expect(nav.sidebarLabel(text)).toBeVisible();
          await expect(nav.sidebarLink(text)).toHaveAttribute("href", path);
        }

        // Escape closes it and gives the page back.
        await page.keyboard.press("Escape");
        await expect(nav.sidebarItems).toHaveCount(0);
        await expect(nav.homeHeading).toBeVisible();

        // Choosing an entry navigates and closes the drawer by itself.
        await pages.shell.menuButton.click();
        await nav.sidebarLink("Badges").click();
        await expect(page).toHaveURL((url) => url.pathname === "/badges");
        await expect(nav.sidebarItems).toHaveCount(0);
        await expect(nav.heading("Badges")).toBeVisible();

        // The drawer's own button closes it too.
        await pages.shell.menuButton.click();
        await expect(nav.sidebarItems).toHaveCount(SIDEBAR_ITEMS.length);
        await nav.collapseButton.click();
        await expect(nav.sidebarItems).toHaveCount(0);
        await expect(page).toHaveURL((url) => url.pathname === "/badges");
        await expect(nav.heading("Badges")).toBeVisible();
      },
    );
  });

  test(
    "A7: an unknown address shows \"Page Not Found\" inside the shell, with a way back home",
    { tag: ["@core"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      const response = await page.goto("/no-such-page-e2e");
      expect(response?.status()).toBe(404);

      await expect(nav.main.getByRole("heading", { level: 1, name: "404", exact: true })).toBeVisible();
      await expect(nav.main.getByRole("heading", { name: "Page Not Found", exact: true })).toBeVisible();
      await expect(
        nav.main.getByText("The page you are looking for doesn't exist or has been moved.", { exact: true }),
      ).toBeVisible();
      // Still the app: header, sidebar and footer are there.
      await expect(nav.headerLogoLink).toBeVisible();
      await expect(nav.sidebarItems).toHaveCount(SIDEBAR_ITEMS.length);
      await expect(nav.footer).toBeVisible();

      const back = nav.main.getByRole("link", { name: "Back to Home", exact: true });
      await expect(back).toHaveAttribute("href", "/");
      await back.click();
      await expect(page).toHaveURL((url) => url.pathname === "/");
      await expect(nav.homeHeading).toBeVisible();

      // A nested unknown address is handled the same way.
      const nested = await page.goto("/badges-faq/no-such-page-e2e");
      expect(nested?.status()).toBe(404);
      await expect(nav.main.getByRole("heading", { name: "Page Not Found", exact: true })).toBeVisible();
    },
  );
});
