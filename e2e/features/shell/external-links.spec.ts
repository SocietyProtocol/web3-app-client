import type { Page } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { ShellNavigationPage } from "../../support/pages/shell-navigation";

/**
 * The Society Protocol links in the top bar (in the drawer below 900px) and
 * the docs banner at the bottom of the sidebar. All logged out.
 */

/** In the order the design shows them. */
const LINKS = [
  { id: "website", name: "Society Protocol website", href: "https://societyprotocol.io", label: "Website" },
  { id: "forum", name: "Forum", href: "https://forum.societyprotocol.io", label: "Forum" },
  { id: "youtube", name: "YouTube", href: "https://www.youtube.com/@SocietyProtocolStream" },
  { id: "discord", name: "Discord", href: "https://discord.com/invite/fpk7eH7aWQ" },
  { id: "x", name: "X", href: "https://x.com/ProtocolSociety" },
] as const;

const NEW_TAB = " (opens in a new tab)";
const DOCS_URL = "https://docs.societyprotocol.io";

/** Checks what every link must carry, in the group that is on screen. */
async function expectAllLinks(nav: ShellNavigationPage) {
  for (const link of LINKS) {
    const anchor = nav.socialLink(link.id);
    await expect(anchor).toBeVisible();
    await expect(anchor).toHaveAttribute("href", link.href);
    await expect(anchor).toHaveAttribute("target", "_blank");
    await expect(anchor).toHaveAttribute("rel", /noopener/);
    await expect(anchor).toHaveAccessibleName(`${link.name}${NEW_TAB}`);
  }
}

/** True when the header is no wider than the page shows. */
function headerFits(page: Page): Promise<boolean> {
  return page.getByRole("banner").evaluate((header) => header.scrollWidth <= header.clientWidth);
}

test.describe("external links", () => {
  test(
    "A12: the header links to the website, forum, YouTube, Discord and X, in that order, in a new tab",
    { tag: ["@smoke"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(nav.homeHeading).toBeVisible();

      await expect(nav.headerSocialLinks).toBeVisible();
      await expect(nav.socialLinks).toHaveCount(1);
      const anchors = nav.socialLinks.getByRole("link");
      await expect(anchors).toHaveCount(LINKS.length);
      for (const [index, link] of LINKS.entries()) {
        await expect(anchors.nth(index)).toHaveAttribute("data-testid", `shell-social-link-${link.id}`);
      }
      await expectAllLinks(nav);

      // The pills show their label; the circles only a glyph.
      for (const link of LINKS) {
        if ("label" in link) await expect(nav.socialLink(link.id)).toHaveText(link.label);
        else await expect(nav.socialLink(link.id)).toHaveText("");
      }
    },
  );

  test(
    "A14: from 900 to 1199px the header shows compact links, a circle names itself on hover",
    { tag: ["@core"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto("/");
      await expect(nav.homeHeading).toBeVisible();

      await expect(nav.headerSocialLinks).toBeVisible();
      await expectAllLinks(nav);
      // Compact: 40px circles instead of 48.
      await expect.poll(async () => (await nav.socialLink("youtube").boundingBox())?.width).toBe(40);

      await nav.socialLink("youtube").hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "YouTube" })).toBeVisible();

      for (const width of [900, 1199, 1200]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(nav.headerSocialLinks).toBeVisible();
        await expect.poll(() => headerFits(page), `header fits at ${width}px`).toBe(true);
      }
    },
  );

  for (const viewport of [
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
  ]) {
    test.describe(`at ${viewport.width}px`, () => {
      test.use({ viewport });

      test(
        `A14: at ${viewport.width}px the links leave the header for the drawer`,
        { tag: ["@core"] },
        async ({ page, pages }) => {
          const nav = new ShellNavigationPage(page);
          await page.goto("/");
          await expect(nav.homeHeading).toBeVisible();

          await expect(nav.headerSocialLinks).toBeHidden();
          await expect(nav.socialLinks).toHaveCount(0);
          await expect.poll(() => headerFits(page), "header fits").toBe(true);

          await pages.shell.menuButton.click();
          await expect(nav.socialLinks).toHaveCount(1);
          await expectAllLinks(nav);
          // Pills on one row, circles on the next.
          const website = await nav.socialLink("website").boundingBox();
          const youtube = await nav.socialLink("youtube").boundingBox();
          const x = await nav.socialLink("x").boundingBox();
          expect(youtube!.y).toBeGreaterThan(website!.y + website!.height - 1);
          expect(Math.abs(x!.y - youtube!.y)).toBeLessThan(2);
        },
      );
    });
  }

  test(
    "A15: the docs banner sits under the last nav item, collapses to a tile and opens the docs in a new tab",
    { tag: ["@core"] },
    async ({ page, context }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(nav.homeHeading).toBeVisible();

      await expect(nav.docsBanner).toHaveCount(1);
      await expect(nav.docsBanner).toHaveAttribute("href", DOCS_URL);
      await expect(nav.docsBanner).toHaveAttribute("target", "_blank");
      await expect(nav.docsBanner).toHaveAttribute("rel", /noopener/);
      await expect(nav.docsBanner).toHaveAccessibleName(`Documentation${NEW_TAB}`);

      // Below the last entry, above the Collapse button.
      const lastItem = await nav.sidebarItem("Auction").boundingBox();
      const banner = await nav.docsBanner.boundingBox();
      const collapse = await nav.collapseButton.boundingBox();
      expect(banner!.y).toBeGreaterThanOrEqual(lastItem!.y + lastItem!.height);
      expect(collapse!.y).toBeGreaterThanOrEqual(banner!.y + banner!.height);

      // Collapsed: a tile that names itself on hover.
      await nav.collapseButton.click();
      await expect(nav.expandButton).toBeVisible();
      await expect.poll(async () => (await nav.docsBanner.boundingBox())?.width).toBeLessThan(86);
      await nav.docsBanner.hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "Documentation" })).toBeVisible();

      // A click opens the docs in a new tab and leaves the app where it was.
      await context.route(`${DOCS_URL}/**`, (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "<title>docs</title>docs" }),
      );
      const popupPromise = page.waitForEvent("popup");
      await nav.docsBanner.click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL((url) => url.origin === DOCS_URL);
      await popup.close();
      await expect(nav.homeHeading).toBeVisible();
    },
  );

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("A15: the docs banner is in the drawer", { tag: ["@core"] }, async ({ page, pages }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(nav.homeHeading).toBeVisible();
      await expect(nav.docsBanner).toHaveCount(0);

      await pages.shell.menuButton.click();
      await expect(nav.docsBanner).toBeVisible();
      await expect(nav.docsBanner).toHaveAttribute("href", DOCS_URL);
    });
  });
});
