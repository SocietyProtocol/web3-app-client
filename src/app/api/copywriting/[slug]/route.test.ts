import { describe, expect, it } from "vitest";

import { GET } from "./route";

function get(slug: string) {
  return GET(new Request(`http://localhost/api/copywriting/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

describe("GET /api/copywriting/[slug]", () => {
  it("serves a known slug", async () => {
    const response = await get("governance");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
  });

  it.each(["no-such-text", "constructor", "toString", "hasOwnProperty", "valueOf", "__proto__"])(
    "answers 404 for the unknown slug %s",
    async (slug) => {
      const response = await get(slug);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
    },
  );
});
