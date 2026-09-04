import { describe, expect, it, vi } from "vitest";

vi.mock("../../../.graphclient", () => ({
  BadgeDocument: {},
  BadgesDocument: {},
  execute: vi.fn(),
}));

import { mergeOptions } from "./utils";

describe("badge query defaults", () => {
  it("starts the required Badges query at skip zero", () => {
    expect(mergeOptions()).toMatchObject({ skip: 0 });
  });

  it("preserves an explicit pagination offset", () => {
    expect(mergeOptions({ skip: 25 })).toMatchObject({ skip: 25 });
  });
});
