import { describe, expect, it } from "vitest";
import {
  badgeActionAmount,
  badgeAmountMaxError,
  badgeAmountValidationSchema,
  burnAllBadgeArgs,
  burnBadgeCallArgs,
  canChooseBadgeAmount,
  maxBadgeAmount,
  transferBadgeCallArgs,
} from "./badgeAmount";
import { burnBadgeValidationSchema } from "./BurnBadge/validation";
import { transferBadgeValidationSchema } from "./TransferTab/validation";

const HOLDER = "0x1111111111111111111111111111111111111111" as const;
const OTHER = "0x2222222222222222222222222222222222222222" as const;

describe("badgeAmountValidationSchema", () => {
  it.each([
    ["1", BigInt(1)],
    ["3", BigInt(3)],
    [" 12 ", BigInt(12)],
  ])("accepts %j", (input, expected) => {
    expect(badgeAmountValidationSchema.parse(input)).toBe(expected);
  });

  it.each(["", "0", "00", "-1", "1.5", "1e3", "abc", "2 3"])(
    "rejects %j",
    (input) => {
      expect(badgeAmountValidationSchema.safeParse(input).success).toBe(false);
    },
  );

  it("says why", () => {
    const issue = (input: string) =>
      badgeAmountValidationSchema.safeParse(input).error?.issues[0].message;
    expect(issue("1.5")).toBe("Enter a whole number");
    expect(issue("0")).toBe("Amount must be at least 1");
  });
});

describe("maxBadgeAmount", () => {
  it("is the holder's balance", () => {
    expect(maxBadgeAmount(BigInt(4), false)).toBe(BigInt(4));
  });

  it("is 1 for a profile badge", () => {
    expect(maxBadgeAmount(BigInt(4), true)).toBe(BigInt(1));
    expect(maxBadgeAmount(undefined, true)).toBe(BigInt(1));
  });

  it("is unknown while the balance is", () => {
    expect(maxBadgeAmount(undefined, false)).toBeUndefined();
  });
});

describe("canChooseBadgeAmount", () => {
  it("only when the holder has more than one copy", () => {
    expect(canChooseBadgeAmount(undefined)).toBe(false);
    expect(canChooseBadgeAmount(BigInt(0))).toBe(false);
    expect(canChooseBadgeAmount(BigInt(1))).toBe(false);
    expect(canChooseBadgeAmount(BigInt(2))).toBe(true);
  });
});

describe("badgeActionAmount", () => {
  it("is 1 for a one-of-one, a profile badge or an unknown balance", () => {
    expect(badgeActionAmount("5", BigInt(1))).toBe(BigInt(1));
    expect(badgeActionAmount("5", maxBadgeAmount(BigInt(9), true))).toBe(
      BigInt(1),
    );
    expect(badgeActionAmount("5", undefined)).toBe(BigInt(1));
    expect(badgeActionAmount("abc", undefined)).toBe(BigInt(1));
  });

  it("is the typed amount when the holder has several", () => {
    expect(badgeActionAmount("3", BigInt(5))).toBe(BigInt(3));
    expect(badgeActionAmount("1", BigInt(5))).toBe(BigInt(1));
  });

  it("is undefined when the typed amount is invalid", () => {
    expect(badgeActionAmount("", BigInt(5))).toBeUndefined();
    expect(badgeActionAmount("0", BigInt(5))).toBeUndefined();
    expect(badgeActionAmount("2.5", BigInt(5))).toBeUndefined();
    expect(badgeActionAmount(undefined, BigInt(5))).toBeUndefined();
  });
});

describe("badgeAmountMaxError", () => {
  it("flags an amount above the balance", () => {
    expect(badgeAmountMaxError(BigInt(6), BigInt(5))).toBe(
      "The holder has only 5",
    );
  });

  it("says when the address holds none", () => {
    expect(badgeAmountMaxError(BigInt(1), BigInt(0))).toBe(
      "This address holds none of this badge",
    );
  });

  it("allows up to the balance", () => {
    expect(badgeAmountMaxError(BigInt(5), BigInt(5))).toBeUndefined();
    expect(badgeAmountMaxError(BigInt(1), BigInt(5))).toBeUndefined();
  });

  it("stays quiet while amount or balance is unknown", () => {
    expect(badgeAmountMaxError(undefined, BigInt(5))).toBeUndefined();
    expect(badgeAmountMaxError(BigInt(6), undefined)).toBeUndefined();
  });
});

describe("form schemas", () => {
  it("burn parses the amount", () => {
    expect(
      burnBadgeValidationSchema.parse({
        holder: HOLDER,
        amount: "2",
        confirmed: true,
      }),
    ).toEqual({ holder: HOLDER, amount: BigInt(2), confirmed: true });
  });

  it("burn rejects a bad amount", () => {
    const result = burnBadgeValidationSchema.safeParse({
      holder: HOLDER,
      amount: "0",
      confirmed: true,
    });
    expect(result.error?.issues.map((i) => i.path)).toEqual([["amount"]]);
  });

  it("transfer parses the amount", () => {
    expect(
      transferBadgeValidationSchema.parse({
        from: HOLDER,
        to: OTHER,
        amount: "3",
      }),
    ).toEqual({ from: HOLDER, to: OTHER, amount: BigInt(3) });
  });

  it("transfer rejects a bad amount", () => {
    const result = transferBadgeValidationSchema.safeParse({
      from: HOLDER,
      to: OTHER,
      amount: "1.5",
    });
    expect(result.error?.issues.map((i) => i.path)).toEqual([["amount"]]);
  });
});

describe("contract call arguments", () => {
  it("burn(from, id, value) carries the amount", () => {
    expect(
      burnBadgeCallArgs({ holder: HOLDER, id: BigInt(42), amount: BigInt(3) }),
    ).toEqual([HOLDER, BigInt(42), BigInt(3)]);
  });

  it("burn without an amount sends 1", () => {
    expect(burnBadgeCallArgs({ holder: HOLDER, id: BigInt(42) })).toEqual([
      HOLDER,
      BigInt(42),
      BigInt(1),
    ]);
  });

  it("burn of a single copy sends 1", () => {
    expect(
      burnBadgeCallArgs({
        holder: HOLDER,
        id: BigInt(42),
        amount: badgeActionAmount("7", BigInt(1))!,
      }),
    ).toEqual([HOLDER, BigInt(42), BigInt(1)]);
  });

  it("safeTransferFrom(from, to, id, value, data) carries the amount", () => {
    expect(
      transferBadgeCallArgs({
        from: HOLDER,
        to: OTHER,
        id: BigInt(42),
        amount: BigInt(2),
      }),
    ).toEqual([HOLDER, OTHER, BigInt(42), BigInt(2), "0x"]);
  });
});

describe("burnAllBadgeArgs (revoking a community member)", () => {
  it("burns every copy the member holds", () => {
    expect(
      burnAllBadgeArgs({ holder: HOLDER, id: BigInt(42), balance: BigInt(2) }),
    ).toEqual({ holder: HOLDER, id: BigInt(42), amount: BigInt(2) });
  });

  it("waits for a known, non-zero balance", () => {
    expect(
      burnAllBadgeArgs({ holder: HOLDER, id: BigInt(42), balance: undefined }),
    ).toBeUndefined();
    expect(
      burnAllBadgeArgs({ holder: HOLDER, id: BigInt(42), balance: BigInt(0) }),
    ).toBeUndefined();
  });
});
