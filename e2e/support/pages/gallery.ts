import { expect, type Locator } from "@playwright/test";

/**
 * Walks the pages of one of the app's paginated galleries (the "view all"
 * modals), from the first page, whatever page was showing. `onPage` runs
 * for each page once its first item is showing; returning true stops.
 */
export async function forEachGalleryPage(
  container: Locator,
  items: Locator,
  onPage: () => Promise<boolean | void>,
): Promise<void> {
  // MUI names the current page's button "page N" and the others "Go to page N".
  const current = (page: number) => container.getByRole("button", { name: `page ${page}`, exact: true });
  const first = container.getByRole("button", { name: "Go to first page" });
  const next = container.getByRole("button", { name: "Go to next page" });

  await expect(items.first()).toBeVisible();
  // A gallery keeps its page while its modal is closed: start over.
  if ((await first.count()) > 0 && (await first.isEnabled())) {
    await first.click();
    await expect(current(1)).toBeVisible();
  }
  for (let page = 1; page <= 200; page += 1) {
    await expect(items.first()).toBeVisible();
    if ((await onPage()) === true) return;
    // A gallery with a single page has no pagination at all.
    if ((await next.count()) === 0 || (await next.isDisabled())) return;
    await next.click();
    await expect(current(page + 1)).toBeVisible();
  }
  throw new Error("The gallery has more than 200 pages");
}
