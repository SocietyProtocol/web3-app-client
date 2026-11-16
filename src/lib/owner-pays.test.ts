import { describe, expect, it, vi } from "vitest";
import {
  Hex,
  decodeFunctionData,
  getAddress,
  parseAbi,
  parseEther,
  toFunctionSelector,
} from "viem";
import { contracts } from "@/consts/contracts";
import {
  LIGHT_ACCOUNT_FACTORY,
  accountCallsFromCallData,
  encodeCreateProfile,
  lightAccountAddress,
} from "@/lib/smart-account";
import {
  EXECUTE_OVERHEAD_GAS,
  OwnerPaysClient,
  OwnerPaysWallet,
  OwnerTransaction,
  accountDeployTransaction,
  accountExecuteTransaction,
  formatEthCeil,
  freeGasUnavailableNoFundsMessage,
  freeGasUnavailableNotice,
  gasUnknownMessage,
  ownerCanPay,
  quoteOwnerPays,
  sendOwnerPaysThroughAccount,
  walletNeedsEthMessage,
  withGasBuffer,
} from "@/lib/owner-pays";

const owner = getAddress("0x00000000000000000000000000000000000000e0");
const smartAccount = lightAccountAddress(owner);
const badges = contracts.badges.sepolia;
const URI = "ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";
const createProfile = { to: badges, value: BigInt(0), data: encodeCreateProfile(URI) };

// Light Account v2 and its factory, as deployed (selectors checked against
// the implementation's bytecode on Sepolia).
const lightAccountAbi = parseAbi([
  "function execute(address dest, uint256 value, bytes func)",
  "function executeBatch(address[] dest, uint256[] value, bytes[] func)",
  "function createAccount(address owner, uint256 salt) returns (address)",
]);

describe("owner-pays transactions", () => {
  it("deploys with LightAccountFactory.createAccount(owner, 0)", () => {
    const deploy = accountDeployTransaction(owner);
    expect(deploy.to).toBe(LIGHT_ACCOUNT_FACTORY);
    expect(deploy.data.slice(0, 10)).toBe("0x5fbfb9cf");
    const decoded = decodeFunctionData({ abi: lightAccountAbi, data: deploy.data });
    expect(decoded.functionName).toBe("createAccount");
    expect(decoded.args).toEqual([owner, BigInt(0)]);
  });

  it("wraps one call in execute(target, 0, data) on the Light Account", () => {
    const execute = accountExecuteTransaction(smartAccount, [createProfile]);
    expect(execute.to).toBe(smartAccount);
    expect(execute.data.slice(0, 10)).toBe(
      toFunctionSelector("function execute(address,uint256,bytes)"),
    );
    expect(execute.data.slice(0, 10)).toBe("0xb61d27f6");
    const decoded = decodeFunctionData({ abi: lightAccountAbi, data: execute.data });
    expect(decoded.args).toEqual([badges, BigInt(0), createProfile.data]);
  });

  it("wraps several calls in executeBatch(address[],uint256[],bytes[])", () => {
    const second = { ...createProfile, to: contracts.communityRegistry.sepolia };
    const execute = accountExecuteTransaction(smartAccount, [createProfile, second]);
    expect(execute.data.slice(0, 10)).toBe("0x47e1da2a");
    expect(accountCallsFromCallData(execute.data)).toEqual([createProfile, second]);
  });

  it("refuses to move ETH through the account, and an empty batch", () => {
    expect(() =>
      accountExecuteTransaction(smartAccount, [{ ...createProfile, value: BigInt(1) }]),
    ).toThrow(/cannot transfer ETH/);
    expect(() => accountExecuteTransaction(smartAccount, [])).toThrow();
  });
});

const DEPLOY_BLOCK = BigInt(1_000);
const EXECUTE_GAS = BigInt(100_000);

function fakeWallet(options: {
  deployed?: boolean;
  /** Reads pinned to the deployment block that fail first: the node is behind. */
  laggingReads?: number;
  deployReverts?: boolean;
  executeReverts?: boolean;
}) {
  const sent: (OwnerTransaction & { gas?: bigint })[] = [];
  let deployed = !!options.deployed;
  let lagging = options.laggingReads ?? 0;
  const pinned: (bigint | undefined)[] = [];
  const wallet: OwnerPaysWallet = {
    sendTransaction: vi.fn(async (transaction: OwnerTransaction & { gas?: bigint }) => {
      sent.push(transaction);
      return `0x${String(sent.length).padStart(64, "0")}` as Hex;
    }),
    waitForReceipt: vi.fn(async () => {
      if (options.deployReverts) {
        return { status: "reverted" as const, blockNumber: DEPLOY_BLOCK };
      }
      deployed = true;
      return { status: "success" as const, blockNumber: DEPLOY_BLOCK };
    }),
    getCode: vi.fn(async (_: unknown, blockNumber?: bigint) => {
      pinned.push(blockNumber);
      if (blockNumber !== undefined && lagging > 0) {
        lagging -= 1;
        throw new Error("header not found");
      }
      return deployed ? ("0x6080" as Hex) : undefined;
    }),
    estimateGas: vi.fn(async (_: unknown, __: unknown, blockNumber?: bigint) => {
      pinned.push(blockNumber);
      if (options.executeReverts) throw new Error("execution reverted");
      return EXECUTE_GAS;
    }),
    wait: vi.fn(async () => undefined),
  };
  return { wallet, sent, pinned };
}

describe("sendOwnerPaysThroughAccount", () => {
  it("sends one execute transaction when the Light Account is deployed", async () => {
    const { wallet, sent } = fakeWallet({ deployed: true });
    const steps: string[] = [];
    const hash = await sendOwnerPaysThroughAccount(wallet, {
      owner,
      calls: [createProfile],
      onStep: (step, info) => steps.push(`${step}/${info.steps}`),
    });
    // The wallet prices it itself, as for any other transaction.
    expect(sent).toEqual([accountExecuteTransaction(smartAccount, [createProfile])]);
    expect(hash).toBe(`0x${"1".padStart(64, "0")}`);
    expect(steps).toEqual(["execute/1"]);
    expect(wallet.waitForReceipt).not.toHaveBeenCalled();
    expect(wallet.estimateGas).not.toHaveBeenCalled();
  });

  it("deploys first, waits for it, then executes when the account has no code", async () => {
    const { wallet, sent } = fakeWallet({});
    const steps: string[] = [];
    const hash = await sendOwnerPaysThroughAccount(wallet, {
      owner,
      calls: [createProfile],
      onStep: (step, info) => steps.push(`${step}/${info.steps}`),
    });
    expect(sent).toEqual([
      accountDeployTransaction(owner),
      {
        ...accountExecuteTransaction(smartAccount, [createProfile]),
        gas: withGasBuffer(EXECUTE_GAS),
      },
    ]);
    expect(wallet.waitForReceipt).toHaveBeenCalledWith(`0x${"1".padStart(64, "0")}`);
    // The hash the app follows is the execute transaction, not the deployment.
    expect(hash).toBe(`0x${"2".padStart(64, "0")}`);
    expect(steps).toEqual(["deploy/2", "execute/2"]);
  });

  it("reads the code and the gas at the deployment's block, as the owner", async () => {
    const { wallet, pinned } = fakeWallet({});
    await sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] });
    // First read: is it deployed at all (latest). Then both pinned.
    expect(pinned).toEqual([undefined, DEPLOY_BLOCK, DEPLOY_BLOCK]);
    expect(wallet.estimateGas).toHaveBeenCalledWith(
      accountExecuteTransaction(smartAccount, [createProfile]),
      owner,
      DEPLOY_BLOCK,
    );
  });

  it("never sends value: the Light Account is not funded", async () => {
    const { wallet, sent } = fakeWallet({});
    await sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] });
    expect(sent).toHaveLength(2);
    for (const transaction of sent) {
      expect(transaction).not.toHaveProperty("value");
    }
  });

  it("waits for a lagging node before executing", async () => {
    const { wallet, sent } = fakeWallet({ laggingReads: 2 });
    await sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] });
    expect(wallet.wait).toHaveBeenCalledTimes(2);
    expect(sent).toHaveLength(2);
    expect(sent[1]?.gas).toBe(withGasBuffer(EXECUTE_GAS));
  });

  it("does not execute while the node cannot show the deployed account", async () => {
    const { wallet, sent } = fakeWallet({ laggingReads: 99 });
    await expect(
      sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] }),
    ).rejects.toThrow("header not found");
    expect(sent).toEqual([accountDeployTransaction(owner)]);
  });

  it("does not execute against an address that has no code", async () => {
    const { wallet, sent } = fakeWallet({});
    wallet.getCode = vi.fn(async () => "0x" as Hex);
    await expect(
      sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] }),
    ).rejects.toThrow(/has not caught up/);
    expect(sent).toEqual([accountDeployTransaction(owner)]);
    expect(wallet.estimateGas).not.toHaveBeenCalled();
  });

  it("does not execute when the call would revert after the deployment", async () => {
    const { wallet, sent } = fakeWallet({ executeReverts: true });
    await expect(
      sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] }),
    ).rejects.toThrow("execution reverted");
    expect(sent).toEqual([accountDeployTransaction(owner)]);
  });

  it("stops when the deployment reverts", async () => {
    const { wallet, sent } = fakeWallet({ deployReverts: true });
    await expect(
      sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] }),
    ).rejects.toThrow(/Setting up your Society account failed/);
    expect(sent).toHaveLength(1);
  });

  it("passes a wallet rejection through", async () => {
    const { wallet } = fakeWallet({ deployed: true });
    const rejection = new Error("User rejected the request.");
    wallet.sendTransaction = vi.fn(async () => {
      throw rejection;
    });
    await expect(
      sendOwnerPaysThroughAccount(wallet, { owner, calls: [createProfile] }),
    ).rejects.toBe(rejection);
  });
});

function fakeClient(options: {
  deployed?: boolean;
  executeReverts?: boolean;
  ownerBalance?: bigint;
  balanceFails?: boolean;
}) {
  return {
    getCode: vi.fn(async () => (options.deployed ? "0x6080" : undefined)),
    estimateGas: vi.fn(async ({ account, to }: { account: unknown; to: unknown }) => {
      if (to === LIGHT_ACCOUNT_FACTORY) return BigInt(150_000);
      if (to === smartAccount) {
        if (options.executeReverts) throw new Error("execution reverted");
        return BigInt(90_000);
      }
      if (account === smartAccount && options.executeReverts) {
        throw new Error("execution reverted");
      }
      return BigInt(60_000);
    }),
    getGasPrice: vi.fn(async () => BigInt(2_000_000_000)),
    getBalance: vi.fn(async () => {
      if (options.balanceFails) throw new Error("rpc down");
      return options.ownerBalance ?? parseEther("1");
    }),
  } as unknown as OwnerPaysClient & Record<string, ReturnType<typeof vi.fn>>;
}

describe("quoteOwnerPays", () => {
  it("prices the owner's execute transaction for a deployed account", async () => {
    const client = fakeClient({ deployed: true });
    const quote = await quoteOwnerPays(client, { owner, calls: [createProfile] });
    expect(quote).toEqual({
      deployed: true,
      gas: BigInt(90_000),
      costWei: BigInt(90_000) * BigInt(2_000_000_000),
      ownerBalance: parseEther("1"),
    });
    expect(client.estimateGas).toHaveBeenCalledTimes(1);
    expect(client.estimateGas).toHaveBeenCalledWith({
      account: owner,
      ...accountExecuteTransaction(smartAccount, [createProfile]),
    });
  });

  it("prices deployment plus the call for an undeployed account", async () => {
    const client = fakeClient({});
    const quote = await quoteOwnerPays(client, { owner, calls: [createProfile] });
    expect(quote.deployed).toBe(false);
    expect(quote.gas).toBe(BigInt(150_000) + BigInt(60_000) + EXECUTE_OVERHEAD_GAS);
    expect(client.estimateGas).toHaveBeenCalledWith({
      account: owner,
      ...accountDeployTransaction(owner),
    });
    expect(client.estimateGas).toHaveBeenCalledWith({
      account: smartAccount,
      to: badges,
      data: createProfile.data,
    });
  });

  it("reads the owner wallet's balance, never the Light Account's", async () => {
    const client = fakeClient({ deployed: true });
    await quoteOwnerPays(client, { owner, calls: [createProfile] });
    expect(client.getBalance).toHaveBeenCalledTimes(1);
    expect(client.getBalance).toHaveBeenCalledWith({ address: owner });
  });

  it("rejects with the revert when the call would fail", async () => {
    await expect(
      quoteOwnerPays(fakeClient({ deployed: true, executeReverts: true }), {
        owner,
        calls: [createProfile],
      }),
    ).rejects.toThrow("execution reverted");
    await expect(
      quoteOwnerPays(fakeClient({ executeReverts: true }), { owner, calls: [createProfile] }),
    ).rejects.toThrow("execution reverted");
  });

  it("still quotes when the balance cannot be read", async () => {
    const quote = await quoteOwnerPays(fakeClient({ deployed: true, balanceFails: true }), {
      owner,
      calls: [createProfile],
    });
    expect(quote.ownerBalance).toBeUndefined();
    expect(ownerCanPay(quote)).toBe(true);
  });
});

describe("ownerCanPay", () => {
  it("compares the wallet's balance with the expected fee", () => {
    expect(ownerCanPay({ costWei: BigInt(10), ownerBalance: BigInt(10) })).toBe(true);
    expect(ownerCanPay({ costWei: BigInt(10), ownerBalance: BigInt(9) })).toBe(false);
  });
});

describe("formatEthCeil", () => {
  it("rounds up to five decimals", () => {
    expect(formatEthCeil(BigInt(1))).toBe("0.00001");
    expect(formatEthCeil(parseEther("0.000012"))).toBe("0.00002");
    expect(formatEthCeil(parseEther("0.5"))).toBe("0.5");
  });
});

describe("owner-pays wording", () => {
  const messages = [
    walletNeedsEthMessage(owner, parseEther("0.002")),
    walletNeedsEthMessage(owner),
    gasUnknownMessage(),
    freeGasUnavailableNotice({ costWei: parseEther("0.0004"), deployed: true }),
    freeGasUnavailableNotice({ costWei: parseEther("0.0004"), deployed: false }),
    freeGasUnavailableNoFundsMessage(owner, parseEther("0.0004")),
  ];

  it("never asks the user to send ETH to the Society account", () => {
    for (const message of messages) {
      expect(message).not.toMatch(/send ETH|top up|deposit|fund (it|your Society)/i);
      expect(message).not.toContain(smartAccount);
    }
  });

  it("says plainly that free gas is unavailable and the wallet pays, with the cost", () => {
    expect(freeGasUnavailableNotice({ costWei: parseEther("0.0004"), deployed: true })).toBe(
      "Free gas is unavailable right now, so your wallet will pay the network fee for this action (about 0.0004 ETH). Confirm it in your wallet.",
    );
    expect(
      freeGasUnavailableNotice({ costWei: parseEther("0.0004"), deployed: false }),
    ).toMatch(/Confirm two transactions in your wallet/);
    expect(freeGasUnavailableNoFundsMessage(owner, parseEther("0.0004"))).toBe(
      `Free gas is unavailable right now and your wallet ${owner} does not have enough ETH to pay the network fee (about 0.0004 ETH). Add ETH to your wallet or try again later.`,
    );
  });
});
