import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { contracts } from "@/consts/contracts";
import {
  lightAccountAddress,
  profileMetadataUriAllowed,
} from "@/lib/smart-account";
import {
  CONFIRM_PROMPT,
  PREVIEW_METADATA_URI,
  SIGN_PROMPT,
  SIGN_WAIT_TEXT,
  paymentLabel,
  pendingWalletPrompt,
  walletPrompt,
  walletWaitText,
} from "@/lib/payment-label";

describe("paymentLabel", () => {
  it("is free for sponsored writes, whatever the gas says", () => {
    expect(paymentLabel({ routeKind: "sponsored", gas: BigInt(0) })).toEqual({
      kind: "free",
    });
    expect(paymentLabel({ routeKind: "sponsored" })).toEqual({ kind: "free" });
  });

  it("is paid by the wallet, with the fee, when the wallet acts", () => {
    expect(paymentLabel({ routeKind: "owner", gas: BigInt(42) })).toEqual({
      kind: "paid",
      feeUsd: BigInt(42),
    });
  });

  it("is paid by the wallet when it pays through the Light Account", () => {
    expect(
      paymentLabel({ routeKind: "owner-through-account", gas: BigInt(7) }),
    ).toEqual({ kind: "paid", feeUsd: BigInt(7) });
  });

  it("still says the wallet pays when the fee is unknown", () => {
    expect(paymentLabel({ routeKind: "owner" })).toEqual({ kind: "paid" });
    expect(
      paymentLabel({ routeKind: "owner", gas: BigInt(5), gasError: true }),
    ).toEqual({ kind: "paid" });
  });

  it("shows loading while the route or fee is being worked out", () => {
    expect(paymentLabel({ gasLoading: true })).toEqual({ kind: "loading" });
    expect(
      paymentLabel({ routeKind: "owner", gasLoading: true }),
    ).toEqual({ kind: "loading" });
  });

  it("shows nothing while the route is unknown", () => {
    expect(paymentLabel({})).toBeNull();
    expect(paymentLabel({ gas: BigInt(0) })).toBeNull();
    expect(paymentLabel({ gas: BigInt(10) })).toBeNull();
  });

  it("shows nothing for a blocked write", () => {
    expect(paymentLabel({ routeKind: "blocked", gas: BigInt(10) })).toBeNull();
  });
});

describe("PREVIEW_METADATA_URI", () => {
  it("is a profile URI Society sponsors, like the real upload", () => {
    expect(profileMetadataUriAllowed(PREVIEW_METADATA_URI)).toBe(true);
  });
});

describe("walletPrompt", () => {
  it("asks for a signature on sponsored writes", () => {
    expect(walletPrompt("sponsored")).toBe(SIGN_PROMPT);
  });

  it("asks to confirm a transaction otherwise", () => {
    expect(walletPrompt("owner")).toBe(CONFIRM_PROMPT);
    expect(walletPrompt("owner-through-account")).toBe(CONFIRM_PROMPT);
    expect(walletPrompt(undefined)).toBe(CONFIRM_PROMPT);
  });
});

describe("pendingWalletPrompt", () => {
  const owner = getAddress("0x00000000000000000000000000000000000000e0");
  const eoa = {
    chainId: 11155111,
    to: contracts.badges.sepolia,
    abi: SocietyProtocolBadgesABI,
    owner,
    smartAccount: lightAccountAddress(owner),
    isContractWallet: false,
  };

  it("asks for a signature on a sponsored createProfile from an EOA", () => {
    expect(
      pendingWalletPrompt({
        ...eoa,
        functionName: "createProfile",
        args: [PREVIEW_METADATA_URI],
      }),
    ).toBe(SIGN_PROMPT);
  });

  it("asks to confirm a transaction when the wallet pays", () => {
    expect(
      pendingWalletPrompt({
        ...eoa,
        functionName: "burn",
        args: [owner, BigInt(1), BigInt(1)],
      }),
    ).toBe(CONFIRM_PROMPT);
  });

  it("asks to confirm a transaction from a contract wallet", () => {
    expect(
      pendingWalletPrompt({
        ...eoa,
        smartAccount: undefined,
        isContractWallet: true,
        functionName: "createProfile",
        args: [PREVIEW_METADATA_URI],
      }),
    ).toBe(CONFIRM_PROMPT);
  });

  it("asks to confirm a transaction when the call cannot be encoded", () => {
    expect(
      pendingWalletPrompt({ ...eoa, functionName: "createProfile", args: [] }),
    ).toBe(CONFIRM_PROMPT);
  });
});

describe("walletWaitText", () => {
  it("waits for a signature on sponsored writes", () => {
    expect(walletWaitText("sponsored", "Signing transaction...")).toBe(
      SIGN_WAIT_TEXT,
    );
  });

  it("keeps the transaction text otherwise", () => {
    expect(walletWaitText("owner", "Signing transaction...")).toBe(
      "Signing transaction...",
    );
    expect(walletWaitText(undefined, "Confirm transaction...")).toBe(
      "Confirm transaction...",
    );
  });
});
