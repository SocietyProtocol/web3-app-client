import { promises as fs } from "node:fs";
import path from "node:path";
import { expect, test } from "../../fixtures";

/**
 * /api/copywriting/<slug>: the texts and the two pictures the pages load
 * at run time (home, FAQs, governance, SPEC token, referrals). The route
 * maps a slug to a file under src/copywriting and serves it.
 *
 * The slug list is repeated here on purpose: it is the route's contract
 * with the pages (MarkdownRenderer src="/api/copywriting/<slug>"). The
 * route's own map is not exported.
 */
const REPO_DIR = path.join(__dirname, "..", "..", "..");

const MARKDOWN: Record<string, string> = {
  "general-info": "General Information.md",
  "home-faqs": "Home FAQs.md",
  "communities-faqs": "Communities FAQs.md",
  "badges-faq": "Badges FAQ.md",
  governance: "Governance.md",
  ico: "ICO.md",
  "spec-token": "SPEC Token.md",
  "referral-program-intro": "Referral Program Intro.md",
  "referral-program-faq": "Referral Program FAQ.md",
};

const IMAGES: Record<string, string> = {
  "general-info-image.png": "general-information.png",
  "spec-token-distribution.png": "spec-token-distribution.png",
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const source = (file: string) => fs.readFile(path.join(REPO_DIR, "src", "copywriting", file));

/** The file as the route serves it: without a leading "---" front matter block. */
function withoutFrontMatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---\n", 4);
  return end === -1 ? markdown : markdown.slice(end + 5);
}

test.describe("/api/copywriting", () => {
  for (const [slug, file] of Object.entries(MARKDOWN)) {
    test(
      `P5: /api/copywriting/${slug} serves ${file} as markdown`,
      { tag: ["@smoke"] },
      async ({ api }) => {
        const response = await api.get(`/api/copywriting/${slug}`);
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toBe("text/markdown; charset=utf-8");

        const body = await response.text();
        expect(body.trim().length, "the text is not empty").toBeGreaterThan(0);
        expect(body.startsWith("---\n"), "no front matter reaches the page").toBe(false);
        // The slug leads to the file the page means, whole.
        expect(body).toBe(withoutFrontMatter((await source(file)).toString("utf8")));
      },
    );
  }

  for (const [slug, file] of Object.entries(IMAGES)) {
    test(
      `P5: /api/copywriting/${slug} serves ${file} as a PNG that may be cached`,
      { tag: ["@smoke"] },
      async ({ api }) => {
        const response = await api.get(`/api/copywriting/${slug}`);
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toBe("image/png");
        expect(response.headers()["cache-control"]).toBe("public, max-age=3600");

        const body = await response.body();
        expect(body.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE), "a PNG").toBe(true);
        expect(body.equals(await source(file)), "the bytes of the file").toBe(true);
      },
    );
  }

  test(
    "P5: a slug that is not on the list is 404, also when it names a file that exists",
    { tag: ["@smoke"] },
    async ({ api }) => {
      const unknown = [
        "no-such-text",
        // Files that exist, under names that are not slugs.
        "Governance.md",
        "general-information.png",
        "governance.md",
        // The slug is not a path.
        encodeURIComponent("../../package.json"),
        encodeURIComponent("../copywriting/Governance.md"),
        // Slugs are matched exactly.
        "GOVERNANCE",
        // Encoded: a space at the end of a URL is dropped before it is sent,
        // which would ask for the real slug.
        encodeURIComponent("governance "),
      ];
      for (const slug of unknown) {
        const response = await api.get(`/api/copywriting/${slug}`);
        expect(response.status(), slug).toBe(404);
      }
      // The route's own answer, not a rendered "Page Not Found".
      const response = await api.get("/api/copywriting/no-such-text");
      expect(await response.text()).toBe("Not Found");
    },
  );

  test(
    "P5: a slug that is the name of a built-in object property is 404 as well",
    { tag: ["@edge"] },
    async ({ api }) => {
      // APP BUG (seen running: a 500, and the server logs that the "path"
      // argument must be a string but was undefined), expected to
      // fail until it is fixed: the route looks the slug up in a plain
      // object (`SLUG_MAP[slug]`, src/app/api/copywriting/[slug]/route.ts),
      // so "constructor", "toString" and the like find the property the
      // object inherits. That is not a list entry, has no `file`, and
      // joining the working directory with `undefined` throws: the visitor
      // gets a 500 for an address that simply does not exist.
      test.fail(true, "inherited object properties pass the slug lookup and the route answers 500");
      for (const slug of ["constructor", "toString", "hasOwnProperty", "valueOf"]) {
        const response = await api.get(`/api/copywriting/${slug}`);
        expect(response.status(), slug).toBe(404);
      }
    },
  );
});
