import { describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("../../../.graphclient", () => ({
  BadgeDocument: {},
  BadgesDocument: {},
  execute,
}));

import { fetchBadge, mergeOptions } from "./utils";

describe("badge query defaults", () => {
  it("starts the required Badges query at skip zero", () => {
    expect(mergeOptions()).toMatchObject({ skip: 0 });
  });

  it("preserves an explicit pagination offset", () => {
    expect(mergeOptions({ skip: 25 })).toMatchObject({ skip: 25 });
  });
});

describe("fetchBadge", () => {
  it("copies holder Metadata onto name and imageUrl", async () => {
    execute.mockResolvedValue({
      data: {
        badge: {
          id: "13",
          holders: [
            {
              id: "0x1",
              name: null,
              bio: null,
              imageUrl: "",
              metadata: {
                name: "Ada",
                bio: "Builder",
                imageUrl: "data:image/png;base64,abc",
              },
            },
          ],
        },
      },
    });

    const result = await fetchBadge("13");
    expect(result.badge?.holders?.[0]?.name).toBe("Ada");
    expect(result.badge?.holders?.[0]?.imageUrl).toBe(
      "data:image/png;base64,abc",
    );
  });
});
