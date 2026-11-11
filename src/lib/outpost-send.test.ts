import { describe, expect, it, vi } from "vitest";
import { Hex, getAddress, parseEther } from "viem";
import { contracts } from "@/consts/contracts";
import { SponsorshipUnavailableError } from "@/lib/aa/errors";
import { OutpostRoute } from "@/lib/outpost-routing";
import { OutpostSendDeps, sendOutpostWrite } from "@/lib/outpost-send";
import {
  OwnerPaysQuote,
  OwnerTransaction,
  accountDeployTransaction,
  accountExecuteTransaction,
  freeGasUnavailableNoFundsMessage,
  withGasBuffer,
} from "@/lib/owner-pays";
import { encodeCreateProfile, lightAccountAddress } from "@/lib/smart-account";

const owner = getAddress("0x00000000000000000000000000000000000000e0");
const smartAccount = lightAccountAddress(owner);
const call = {
  to: contracts.badges.sepolia,
  value: BigInt(0),
  data: encodeCreateProfile("ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy"),
};

const SPONSORED_HASH = `0x${"a".repeat(64)}` as Hex;
const OWNER_HASH = `0x${"b".repeat(64)}` as Hex;

const sponsored: OutpostRoute = { kind: "sponsored", sender: smartAccount, sponsor: true };
const throughAccount: OutpostRoute = {
  kind: "owner-through-account",
  sender: smartAccount,
  payer: owner,
  sponsor: false,
};
const asOwner: OutpostRoute = { kind: "owner", sender: owner, payer: owner, sponsor: false };

function harness(options: {
  sponsoredFails?: unknown;
  deployed?: boolean;
  simulationFails?: unknown;
  quote?: Partial<OwnerPaysQuote>;
}) {
  const sent: (OwnerTransaction & { gas?: bigint })[] = [];
  let deployed = options.deployed ?? true;
  const events: string[] = [];
  const quote: OwnerPaysQuote = {
    deployed,
    gas: BigInt(100_000),
    costWei: parseEther("0.0002"),
    ownerBalance: parseEther("1"),
    ...options.quote,
  };
  const deps = {
    sendSponsored: vi.fn(async () => {
      if (options.sponsoredFails) throw options.sponsoredFails;
      return SPONSORED_HASH;
    }),
    sendAsOwner: vi.fn(async () => OWNER_HASH),
    simulateAsAccount: vi.fn(async () => {
      if (options.simulationFails) throw options.simulationFails;
    }),
    quoteOwnerPays: vi.fn(async () => quote),
    ownerWallet: vi.fn(async () => ({
      sendTransaction: async (transaction: OwnerTransaction & { gas?: bigint }) => {
        sent.push(transaction);
        return `0x${String(sent.length).padStart(64, "0")}` as Hex;
      },
      waitForReceipt: async () => {
        deployed = true;
        return { status: "success" as const, blockNumber: BigInt(7) };
      },
      getCode: async () => (deployed ? ("0x6080" as Hex) : undefined),
      estimateGas: async () => BigInt(100_000),
    })),
    onSponsorshipUnavailable: vi.fn((notified: OwnerPaysQuote) => {
      events.push(`notice:${notified.costWei}`);
    }),
    onOwnerPaysStep: vi.fn((step: string) => {
      events.push(step);
    }),
  } satisfies OutpostSendDeps;
  return { deps, sent, events, quote };
}

const refusal = (message: string) =>
  new SponsorshipUnavailableError(Object.assign(new Error("RPC Request failed."), { details: message }));

describe("sendOutpostWrite", () => {
  it("sends a sponsored write through the paymaster when it is available", async () => {
    const { deps, sent } = harness({});
    await expect(
      sendOutpostWrite(deps, { route: sponsored, owner, call: () => call }),
    ).resolves.toBe(SPONSORED_HASH);
    expect(sent).toHaveLength(0);
    expect(deps.onSponsorshipUnavailable).not.toHaveBeenCalled();
    expect(deps.ownerWallet).not.toHaveBeenCalled();
  });

  it.each([
    "Too many sponsorship requests",
    "Daily sponsored profile update limit reached",
    "Daily sponsored invite limit reached",
    "Too many requests",
    "Sponsorship is not configured",
    "Sponsorship provider did not respond",
    "sponsorship policy sp_eager_ricochet has reached its global spending limit",
  ])("falls back to the owner wallet when sponsorship is refused: %s", async (message) => {
    const { deps, sent, events, quote } = harness({ sponsoredFails: refusal(message) });
    const hash = await sendOutpostWrite(deps, { route: sponsored, owner, call: () => call });
    // The Light Account still makes the call; the wallet pays for it.
    expect(sent).toEqual([accountExecuteTransaction(smartAccount, [call])]);
    expect(hash).toBe(`0x${"1".padStart(64, "0")}`);
    // The user is told, with the cost, before the wallet is asked.
    expect(deps.onSponsorshipUnavailable).toHaveBeenCalledWith(quote, expect.any(Error));
    expect(events).toEqual([`notice:${quote.costWei}`, "execute"]);
    expect(deps.sendAsOwner).not.toHaveBeenCalled();
  });

  it("falls back with a deployment first when the Light Account has no code", async () => {
    const { deps, sent, events } = harness({
      sponsoredFails: refusal("Too many sponsorship requests"),
      deployed: false,
    });
    await sendOutpostWrite(deps, { route: sponsored, owner, call: () => call });
    expect(sent).toEqual([
      accountDeployTransaction(owner),
      { ...accountExecuteTransaction(smartAccount, [call]), gas: withGasBuffer(BigInt(100_000)) },
    ]);
    expect(events).toEqual([expect.stringMatching(/^notice:/), "deploy", "execute"]);
  });

  it("does not fall back when the call itself would revert", async () => {
    const revert = Object.assign(new Error("The contract function reverted"), {
      cause: { data: { errorName: "ProfileAlreadyExists" } },
    });
    const { deps, sent } = harness({
      // Bundlers report an inner revert at estimation, before the signature.
      sponsoredFails: refusal("UserOperation reverted during simulation with reason: 0x"),
      simulationFails: revert,
    });
    await expect(
      sendOutpostWrite(deps, { route: sponsored, owner, call: () => call }),
    ).rejects.toBe(revert);
    expect(sent).toHaveLength(0);
    expect(deps.onSponsorshipUnavailable).not.toHaveBeenCalled();
    expect(deps.quoteOwnerPays).not.toHaveBeenCalled();
  });

  it("does not fall back when the user rejected, or after the signature", async () => {
    for (const error of [
      new Error("User rejected the request."),
      new Error("eth_sendUserOperation failed: AA25 invalid account nonce"),
    ]) {
      const { deps, sent } = harness({ sponsoredFails: error });
      await expect(
        sendOutpostWrite(deps, { route: sponsored, owner, call: () => call }),
      ).rejects.toBe(error);
      expect(sent).toHaveLength(0);
      expect(deps.simulateAsAccount).not.toHaveBeenCalled();
      expect(deps.onSponsorshipUnavailable).not.toHaveBeenCalled();
    }
  });

  it("says the wallet is short instead of prompting it, and names the wallet", async () => {
    const { deps, sent } = harness({
      sponsoredFails: refusal("Daily sponsored profile update limit reached"),
      quote: { ownerBalance: BigInt(1) },
    });
    const error = await sendOutpostWrite(deps, {
      route: sponsored,
      owner,
      call: () => call,
    }).catch((caught: Error) => caught);
    expect((error as Error).message).toBe(
      freeGasUnavailableNoFundsMessage(owner, parseEther("0.0002")),
    );
    expect((error as Error).message).not.toContain(smartAccount);
    expect((error as Error).cause).toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it("sends an unsponsored Outpost call through the account without trying the paymaster", async () => {
    const { deps, sent } = harness({});
    await sendOutpostWrite(deps, { route: throughAccount, owner, call: () => call });
    expect(sent).toEqual([accountExecuteTransaction(smartAccount, [call])]);
    expect(deps.sendSponsored).not.toHaveBeenCalled();
    expect(deps.onSponsorshipUnavailable).not.toHaveBeenCalled();
  });

  it("deploys then executes for an unsponsored call from an undeployed account", async () => {
    const { deps, sent, events } = harness({ deployed: false });
    await sendOutpostWrite(deps, { route: throughAccount, owner, call: () => call });
    expect(sent).toEqual([
      accountDeployTransaction(owner),
      { ...accountExecuteTransaction(smartAccount, [call]), gas: withGasBuffer(BigInt(100_000)) },
    ]);
    expect(events).toEqual(["deploy", "execute"]);
  });

  it("leaves an owner-only call to the wallet's own write, unchanged", async () => {
    const { deps, sent } = harness({});
    const encode = vi.fn(() => call);
    await expect(
      sendOutpostWrite(deps, { route: asOwner, owner, call: encode }),
    ).resolves.toBe(OWNER_HASH);
    expect(deps.sendAsOwner).toHaveBeenCalledTimes(1);
    expect(deps.sendSponsored).not.toHaveBeenCalled();
    expect(deps.ownerWallet).not.toHaveBeenCalled();
    expect(encode).not.toHaveBeenCalled();
    expect(sent).toHaveLength(0);
  });

  it("throws a blocked route's reason", async () => {
    const { deps } = harness({});
    const reason = new Error("reverted");
    await expect(
      sendOutpostWrite(deps, {
        route: { kind: "blocked", sponsor: false, error: reason },
        owner,
        call: () => call,
      }),
    ).rejects.toBe(reason);
    await expect(
      sendOutpostWrite(deps, {
        route: { kind: "blocked", sponsor: false, message: "This action would fail" },
        owner,
        call: () => call,
      }),
    ).rejects.toThrow("This action would fail");
  });
});
