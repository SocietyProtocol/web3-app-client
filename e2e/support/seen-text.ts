import type { BrowserContext } from "@playwright/test";

/**
 * Every piece of text the pages of a test have shown, including what was
 * only on screen for a moment (toasts, a notice that the next step
 * replaced). For "the app never says X during this flow": a locator can
 * only say that X is not there now.
 *
 * A MutationObserver in the page reports the text of each element that
 * directly holds text, once, as it is added or changed. So an entry is a
 * label, a sentence or a short paragraph, never the whole page. Text that
 * is in the document but hidden is reported too.
 */
export class SeenText {
  private readonly texts = new Set<string>();
  private context?: BrowserContext;

  async install(context: BrowserContext) {
    this.context = context;
    await context.exposeBinding("__e2eSeenText", (_source, batch: string[]) => {
      for (const text of batch) this.texts.add(text);
    });
    await context.addInitScript(observeText);
  }

  /** Everything shown so far, in the order it first appeared. */
  async all(): Promise<string[]> {
    // The page reports asynchronously. A round trip to each page puts this
    // call behind the reports that were already on their way.
    await Promise.all(
      (this.context?.pages() ?? []).map((page) => page.evaluate(() => undefined).catch(() => undefined)),
    );
    return [...this.texts];
  }

  /** The texts that match. */
  async matching(pattern: RegExp | ((text: string) => boolean)): Promise<string[]> {
    const test = typeof pattern === "function" ? pattern : (text: string) => pattern.test(text);
    return (await this.all()).filter(test);
  }
}

/** Runs in the page, before any of its scripts. */
function observeText() {
  const report = (window as unknown as { __e2eSeenText?: (batch: string[]) => void }).__e2eSeenText;
  if (typeof report !== "function") return;
  const seen = new Set<string>();
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  const MAX_LENGTH = 2_000;

  const add = (textNode: Node, batch: string[]) => {
    const holder = textNode.parentElement;
    if (!holder || SKIP.has(holder.tagName)) return;
    const text = (holder.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text || text.length > MAX_LENGTH || seen.has(text)) return;
    seen.add(text);
    batch.push(text);
  };
  const collect = (node: Node, batch: string[]) => {
    if (node.nodeType === Node.TEXT_NODE) return add(node, batch);
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) add(text, batch);
  };

  new MutationObserver((records) => {
    const batch: string[] = [];
    for (const record of records) {
      if (record.type === "characterData") add(record.target, batch);
      else record.addedNodes.forEach((node) => collect(node, batch));
    }
    if (batch.length) report(batch);
  }).observe(document, { subtree: true, childList: true, characterData: true });
}
