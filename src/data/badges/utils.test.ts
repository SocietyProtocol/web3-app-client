import { describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("../../../.graphclient", () => ({
  BadgeDocument: {},
  BadgesDocument: {},
  execute,
}));

import { Address } from "viem";
import {
  buildWhereClause,
  fetchBadge,
  getBadgePermissions,
  mergeOptions,
  normalizeAddresses,
} from "./utils";
import { FullBadgeData } from "./types";

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

describe("legacy manager wallets", () => {
  const S = "0xa47f4d7d2fabdbfdce865501adc55a2b370c88cb";
  const E = "0x9ba704115f0ed3a431a025ffa0525fdd1d507c3c";

  it("filters managed badges by every identity address", () => {
    const options = mergeOptions({ managerAddress: [S.toUpperCase(), E] });
    expect(options.managerAddress).toEqual([S, E]);
    expect(buildWhereClause(options).and).toContainEqual({
      managers_: { id_in: [S, E] },
    });
  });

  it("keeps a single manager filter as a plain id", () => {
    expect(normalizeAddresses([S, S.toUpperCase()])).toBe(S);
    expect(buildWhereClause({ managerAddress: S }).and).toContainEqual({
      managers_: { id: S },
    });
    expect(normalizeAddresses([])).toBeUndefined();
  });

  it("grants a permission held by the owner wallet", () => {
    const badge = {
      minters: [{ holders: [{ id: E.toUpperCase() }] }],
      burners: [{ holders: [{ id: S }] }],
      transferers: [{ holders: [] }],
    } as unknown as FullBadgeData;

    expect(getBadgePermissions(badge, [S, E] as Address[])).toEqual({
      canMint: true,
      canBurn: true,
      canTransfer: false,
    });
    expect(getBadgePermissions(badge, S as Address)).toEqual({
      canMint: false,
      canBurn: true,
      canTransfer: false,
    });
  });
});
