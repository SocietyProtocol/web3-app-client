import { expect, test } from "../../fixtures";
import { ShellNavigationPage, readCopy } from "../../support/pages/shell-navigation";

/**
 * The pages that only show copy: the two FAQs and /spec-token. Their text
 * is markdown served by /api/copywriting/<slug>; the tests read the same
 * route and expect the page to show what it serves.
 */

/** The shares of the distribution chart (src/components/SpecToken/SpecTokenDistributionChart.tsx). */
const DISTRIBUTION = [
  { label: "Affiliates", percent: 25 },
  { label: "Core Team", percent: 7 },
  { label: "Treasury", percent: 27 },
  { label: "ICO", percent: 31 },
  { label: "Liquidity Providers", percent: 5 },
  { label: "Retroactive Rewards", percent: 5 },
];

/** The "####" headings of a markdown document, as plain text. */
function headingsOf(markdown: string): string[] {
  return [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].trim());
}

const FAQ_PAGES = [
  {
    path: "/badges-faq",
    slug: "badges-faq",
    title: "Badges FAQ | Society Protocol",
    heading: "Badges FAQ",
    lead: "Everything you need to know about Badges on Society Protocol",
  },
  {
    path: "/communities-faq",
    slug: "communities-faqs",
    title: "Communities FAQ | Society Protocol",
    heading: "Communities FAQ",
    lead: "Everything you need to know about creating and managing a community",
  },
];

test.describe("static pages", () => {
  for (const faq of FAQ_PAGES) {
    test(
      `A6: ${faq.path} shows every question of its copy, and an answer opens on a click`,
      { tag: ["@smoke"] },
      async ({ page, api }) => {
        const nav = new ShellNavigationPage(page);
        const copy = await readCopy(api, faq.slug);
        expect(copy.questions.length, "questions in the served copy").toBeGreaterThan(0);

        const loaded = page.waitForResponse(
          (response) => new URL(response.url()).pathname === `/api/copywriting/${faq.slug}`,
        );
        const response = await page.goto(faq.path);
        expect(response?.status()).toBe(200);
        expect((await loaded).status()).toBe(200);

        await expect(page).toHaveTitle(faq.title);
        await expect(nav.heading(faq.heading)).toBeVisible();
        await expect(nav.main.getByText(faq.lead, { exact: true })).toBeVisible();
        await expect(nav.copyLoadError).toHaveCount(0);

        for (const question of copy.questions) await expect(nav.question(question)).toBeVisible();
        await expect(nav.closedQuestions).toHaveCount(copy.questions.length);

        // One answer at a time is whatever the reader opens: opening the first leaves the others closed.
        const first = nav.question(copy.questions[0]);
        await first.click();
        await expect(first).toHaveAttribute("aria-expanded", "true");
        await expect(nav.closedQuestions).toHaveCount(copy.questions.length - 1);
        await first.click();
        await expect(nav.closedQuestions).toHaveCount(copy.questions.length);

        // The FAQ has a way back even when it was opened directly.
        await expect(nav.main.getByRole("button", { name: "Go back" })).toBeEnabled();
      },
    );
  }

  test(
    "A6: /badges-faq answers \"What is a Badge?\"",
    { tag: ["@core"] },
    async ({ page }) => {
      const nav = new ShellNavigationPage(page);
      await page.goto("/badges-faq");
      const question = nav.question("What is a Badge?");
      const answer = nav.main.getByText(/^A Badge is an on-chain credential/);
      await expect(question).toBeVisible();
      await expect(answer).toBeHidden();
      await question.click();
      await expect(answer).toBeVisible();
    },
  );

  test(
    "A6: /spec-token shows its copy and the distribution chart",
    { tag: ["@smoke"] },
    async ({ page, api }) => {
      const nav = new ShellNavigationPage(page);
      const copy = await readCopy(api, "spec-token");
      const headings = headingsOf(copy.markdown);
      expect(headings.length, "headings in the served copy").toBeGreaterThan(0);

      const response = await page.goto("/spec-token");
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle("SPEC Token | Society Protocol");
      await expect(nav.heading("SPEC Token")).toBeVisible();

      // The copy: every heading the route serves is a heading on the page.
      for (const heading of headings) {
        await expect(nav.main.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      }
      await expect(nav.copyLoadError).toHaveCount(0);

      // The chart.
      const chart = nav.distributionChart;
      await expect(chart.getByRole("heading", { name: "SPEC Token Distribution", exact: true })).toBeVisible();
      await expect(chart.getByText("Total Supply: 10,000,000,000 SPEC", { exact: true })).toBeVisible();
      await expect(nav.distributionLegend).toHaveCount(DISTRIBUTION.length);
      for (const { label, percent } of DISTRIBUTION) {
        await expect(nav.distributionLegendButton(label)).toHaveText(new RegExp(`^${label}\\s*${percent}%$`));
      }
      // The slices of the pie are not counted: the chart library's markup has
      // no role, label or test id to find them by. The legend and the middle
      // of the pie, below, are what this test knows of the chart.

      // Nothing picked: the middle of the pie shows the total supply.
      const center = nav.distributionChartCenter;
      await expect(center).toHaveText(/^Total Supply\s*10B\s*SPEC$/);

      // Picking a share in the legend puts it in the middle; picking it again clears it.
      await nav.distributionLegendButton("ICO").click();
      await expect(center).toHaveText(/^ICO\s*31%$/);
      await nav.distributionLegendButton("Treasury").click();
      await expect(center).toHaveText(/^Treasury\s*27%$/);
      await nav.distributionLegendButton("Treasury").click();
      await expect(center).toHaveText(/^Total Supply\s*10B\s*SPEC$/);
    },
  );
});
