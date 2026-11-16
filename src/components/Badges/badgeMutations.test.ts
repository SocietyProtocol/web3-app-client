import { beforeEach, describe, expect, it, vi } from "vitest";

const BADGES = "0x3333333333333333333333333333333333333333";
const HOLDER = "0x1111111111111111111111111111111111111111" as const;
const OTHER = "0x2222222222222222222222222222222222222222" as const;

const useTransaction = vi.fn((options: unknown) => options);

vi.mock("@/hooks/useTransaction", () => ({
  useTransaction: (options: unknown) => useTransaction(options),
}));
vi.mock("@/hooks/useChainVar", () => ({ useChainVar: () => BADGES }));
vi.mock("@/hooks/useOutpostAccount", () => ({
  useOutpostAccount: () => ({ address: undefined }),
}));
vi.mock("@/lib/posthog", () => ({ capturePostHogEvent: vi.fn() }));
vi.mock("@/data/badges/decodeUtils", () => ({
  decodeBurnTransfer: vi.fn(),
  decodeBadgeTransfer: vi.fn(),
}));

const { useBurnBadgeMutation } = await import(
  "./BurnBadge/useBurnBadgeMutation"
);
const { useTransferBadgeMutation } = await import(
  "./TransferTab/useTransferBadgeMutation"
);

const lastCall = () =>
  useTransaction.mock.calls.at(-1)?.[0] as {
    functionName: string;
    args: unknown;
  };

// The hooks only call mocked hooks, so they can run outside React.
describe("badge mutation hooks", () => {
  beforeEach(() => {
    useTransaction.mockClear();
  });

  it("burn sends the chosen amount", () => {
    useBurnBadgeMutation({
      args: { id: BigInt(42), holder: HOLDER, amount: BigInt(3) },
    });
    expect(lastCall().functionName).toBe("burn");
    expect(lastCall().args).toEqual([HOLDER, BigInt(42), BigInt(3)]);
  });

  it("burn without args sends nothing", () => {
    useBurnBadgeMutation({});
    expect(lastCall().args).toBeUndefined();
  });

  it("transfer sends the chosen amount", () => {
    useTransferBadgeMutation({
      args: { id: BigInt(42), from: HOLDER, to: OTHER, amount: BigInt(2) },
    });
    expect(lastCall().functionName).toBe("safeTransferFrom");
    expect(lastCall().args).toEqual([
      HOLDER,
      OTHER,
      BigInt(42),
      BigInt(2),
      "0x",
    ]);
  });
});
