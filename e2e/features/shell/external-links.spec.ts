import type { Locator, Page } from "@playwright/test";
import { URLS } from "../../../src/consts/urls";
import { expect, test } from "../../fixtures";
import { ShellNavigationPage } from "../../support/pages/shell-navigation";

/**
 * The Society Protocol links in the top bar (in the drawer below 900px) and
 * the docs banner at the bottom of the sidebar.
 */

/** Every link the design has, in its order. */
const ALL_LINKS = [
  { id: "website", name: "Society Protocol website", href: "https://societyprotocol.io", label: "Website" },
  { id: "forum", name: "Forum", href: "https://forum.societyprotocol.io", label: "Forum" },
  { id: "youtube", name: "YouTube", href: URLS.YOUTUBE },
  { id: "discord", name: "Discord", href: "https://discord.com/invite/fpk7eH7aWQ" },
  { id: "x", name: "X", href: "https://x.com/ProtocolSociety" },
] as const;

/**
 * The links the app shows: YouTube is left out while its URL is null in
 * src/consts/urls.ts (the channel URL has not been supplied yet).
 */
const LINKS = ALL_LINKS.filter((link) => link.href !== null);

const NEW_TAB = " (opens in a new tab)";
const DOCS_URL = "https://docs.societyprotocol.io";

/** The design's "selected" fill: the theme's action.selected (white at 4.7%). */
const SELECTED_FILL = "rgba(255, 255, 255, 0.047)";
/** The outline colour of the links, brand.outline #F1EDE4. */
const OUTLINE = "rgb(241, 237, 228)";

/** The widest name a profile may have (src/validation/account.ts: 100 characters), with no break in it. */
const LONG_NAME = `A14 ${"W".repeat(96)}`;

/** Checks what every link must carry, in the group that is on screen. */
async function expectAllLinks(nav: ShellNavigationPage) {
  for (const link of LINKS) {
    const anchor = nav.socialLink(link.id);
    await expect(anchor).toBeVisible();
    await expect(anchor).toHaveAttribute("href", link.href!);
    await expect(anchor).toHaveAttribute("target", "_blank");
    await expect(anchor).toHaveAttribute("rel", /noopener/);
    await expect(anchor).toHaveAccessibleName(`${link.name}${NEW_TAB}`);
  }
  if (URLS.YOUTUBE === null) await expect(nav.socialLink("youtube")).toHaveCount(0);
}

/** True when the header is no wider than the page shows. */
function headerFits(page: Page): Promise<boolean> {
  return page.getByRole("banner").evaluate((header) => header.scrollWidth <= header.clientWidth);
}

/** The left and right edges of an element on screen. */
async function edges(locator: Locator): Promise<{ left: number; right: number }> {
  const box = await locator.boundingBox();
  expect(box, "element is on screen").not.toBeNull();
  return { left: box!.x, right: box!.x + box!.width };
}

/** Moves the keyboard focus forward until `target` has it. */
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

test.describe("external links", () => {
  test(
    "A12: the header links to the website, forum, Discord and X (YouTube once its URL is set), in that order, in a new tab",
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
    "A13: keyboard focus and hover give a link the selected fill and focus an outline; no link claims to be the current page",
    { tag: ["@core"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/");
      await expect(nav.homeHeading).toBeVisible();

      const website = nav.socialLink("website");
      const websitePill = website.getByTestId("shell-social-pill");
      const discord = nav.socialLink("discord");
      const discordCircle = discord.getByTestId("shell-social-circle");

      // At rest: no fill.
      await expect(websitePill).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(discordCircle).toHaveCSS("box-shadow", "none");

      // Keyboard focus: the selected fill and a visible outline.
      await tabTo(page, website);
      await expect(website).toBeFocused();
      await expect(websitePill).toHaveCSS("background-color", SELECTED_FILL);
      await expect(website).toHaveCSS("outline-style", "solid");
      await expect(website).toHaveCSS("outline-width", "2px");
      await expect(website).toHaveCSS("outline-color", OUTLINE);

      // Focus moves on: the fill goes with it.
      await page.keyboard.press("Tab");
      await expect(website).not.toBeFocused();
      await expect(websitePill).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

      // Hover on a circle: the same fill, laid over its opaque background.
      await discord.hover();
      await expect(discordCircle).toHaveCSS("box-shadow", new RegExp(`^${SELECTED_FILL.replace(/[().]/g, "\\$&")} .*inset$`));

      // An external link is never "where the user is".
      for (const anchor of await nav.socialLinks.getByRole("link").all()) {
        await expect(anchor).not.toHaveAttribute("aria-current");
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
      await expect.poll(async () => (await nav.socialLink("discord").boundingBox())?.width).toBe(40);

      await nav.socialLink("discord").hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "Discord" })).toBeVisible();

      await page.setViewportSize({ width: 1440, height: 900 });
      await expect.poll(async () => (await nav.socialLink("discord").boundingBox())?.width).toBe(48);
    },
  );

  test(
    "A14: with a connected member's longest name the header fits at 900, 1024, 1199 and 1200px",
    { tag: ["@core"] },
    async ({ page, pages, persona }) => {
      await persona("member", { name: LONG_NAME });
      const nav = new ShellNavigationPage(page);
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.goto("/");
      await pages.shell.connect();
      const name = pages.shell.accountButton.getByTitle(LONG_NAME);
      await expect(name).toBeVisible();

      for (const width of [900, 1024, 1199, 1200]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(nav.headerSocialLinks).toBeVisible();
        await expectAllLinks(nav);
        await expect.poll(() => headerFits(page), `header fits at ${width}px`).toBe(true);

        // Logo, links and account button side by side, all on screen.
        const logo = await edges(nav.headerLogoLink);
        const links = await edges(nav.headerSocialLinks);
        const account = await edges(pages.shell.accountButton);
        expect(links.left, `links clear the logo at ${width}px`).toBeGreaterThanOrEqual(logo.right);
        expect(account.left, `account button clears the links at ${width}px`).toBeGreaterThanOrEqual(links.right);
        expect(account.right, `account button on screen at ${width}px`).toBeLessThanOrEqual(width);

        // The name is cut short, not the layout.
        expect(
          await name.evaluate((el) => el.scrollWidth > el.clientWidth),
          `name is truncated at ${width}px`,
        ).toBe(true);
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
          const discord = await nav.socialLink("discord").boundingBox();
          const x = await nav.socialLink("x").boundingBox();
          expect(discord!.y).toBeGreaterThan(website!.y + website!.height - 1);
          expect(Math.abs(x!.y - discord!.y)).toBeLessThan(2);
        },
      );

      test(
        `A14: at ${viewport.width}px a connected member's longest name fits the header, and the drawer's links fit the drawer`,
        { tag: ["@core"] },
        async ({ page, pages, persona }) => {
          await persona("member", { name: LONG_NAME });
          const nav = new ShellNavigationPage(page);
          await page.goto("/");
          await pages.shell.connect();
          await expect(pages.shell.accountButton.getByTitle(LONG_NAME)).toBeVisible();

          await expect(nav.headerSocialLinks).toBeHidden();
          await expect.poll(() => headerFits(page), "header fits").toBe(true);
          const account = await edges(pages.shell.accountButton);
          expect(account.right, "account button on screen").toBeLessThanOrEqual(viewport.width);
          expect(account.left, "account button clears the logo").toBeGreaterThanOrEqual(
            (await edges(nav.headerLogoLink)).right,
          );

          await pages.shell.menuButton.click();
          await expect(nav.socialLinks).toHaveCount(1);
          await expect(nav.docsBanner).toBeVisible();
          // The banner spans the drawer's content; every link stays inside it.
          // Polled: the drawer slides in, so each measurement must be taken
          // once it is in place.
          await expect
            .poll(async () => {
              const outside: string[] = [];
              const banner = await edges(nav.docsBanner);
              if (banner.left < 0 || banner.right > Math.min(viewport.width, 312)) outside.push("docs banner");
              for (const link of LINKS) {
                const box = await edges(nav.socialLink(link.id));
                if (box.left < banner.left - 1 || box.right > banner.right + 1) outside.push(link.id);
              }
              return outside;
            }, "links outside the drawer's content")
            .toEqual([]);
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
      await expect(nav.docsBanner.getByTestId("shell-docs-banner-label")).toHaveText("Documentation");
      // Not a navigation entry: the sidebar still lists its eight.
      await expect(nav.sidebarItems).toHaveCount(8);

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
      await expect(page).toHaveURL((url) => url.pathname === "/");
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
      await expect(nav.docsBanner).toHaveAttribute("target", "_blank");
      await expect(nav.docsBanner.getByTestId("shell-docs-banner-label")).toHaveText("Documentation");
    });
  });
});
