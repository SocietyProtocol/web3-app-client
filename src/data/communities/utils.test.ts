import { describe, expect, it, vi } from "vitest";

vi.mock("../../../.graphclient", () => ({
  BadgeDocument: {},
  BadgesDocument: {},
  CommunitiesDocument: {},
  CommunityDocument: {},
  execute: vi.fn(),
}));

import { buildWhereClause, mergeOptions } from "./utils";

const S = "0xa47f4d7d2fabdbfdce865501adc55a2b370c88cb";
const E = "0x9ba704115f0ed3a431a025ffa0525fdd1d507c3c";

describe("community manager filter", () => {
  it("matches communities managed by either identity address", () => {
    const options = mergeOptions({ managerAddress: [S, E.toUpperCase()] });
    expect(options.managerAddress).toEqual([S, E]);
    expect(buildWhereClause(options).and).toContainEqual({
      manager_: { id_in: [S, E] },
    });
  });

  it("keeps a single manager as a plain id", () => {
    expect(buildWhereClause({ managerAddress: [S] }).and).toContainEqual({
      manager_: { id: S },
    });
  });

  it("falls back to the member filter without a manager", () => {
    expect(buildWhereClause({ memberAddress: S }).and).toContainEqual({
      members_: { id: S },
    });
  });
});
