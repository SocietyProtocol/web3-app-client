import { describe, expect, it, vi } from "vitest";
import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  encodeFunctionData,
  getAddress,
  parseEther,
} from "viem";
import { contracts } from "@/consts/contracts";
import {
  LIGHT_ACCOUNT_FACTORY,
  encodeCreateProfile,
  lightAccountAddress,
} from "@/lib/smart-account";
import {
  ROUTE_UNCHECKED_MESSAGE,
  RoutingClient,
  callShape,
  chooseWriteSender,
  isContractWalletCode,
  outpostIdentity,
  resolveOutpostRoute,
} from "@/lib/outpost-routing";
import {
  EXECUTE_OVERHEAD_GAS,
  gasUnknownMessage,
  walletNeedsEthMessage,
} from "@/lib/owner-pays";

const SEPOLIA = 11155111;
const owner = getAddress("0x00000000000000000000000000000000000000e0");
const smartAccount = lightAccountAddress(owner);
const badges = contracts.badges.sepolia;
const registry = contracts.communityRegistry.sepolia;
const other = getAddress("0x00000000000000000000000000000000000000aa");

const ok = { ok: true } as const;
const fail = (error: unknown = new Error("execution reverted")) =>
  ({ ok: false, error }) as const;

const base = {
  owner,
  smartAccount,
  isContractWallet: false,
  relayable: true,
  sponsored: false,
};

describe("isContractWalletCode", () => {
  it("treats empty code as an EOA", () => {
    expect(isContractWalletCode(undefined)).toBe(false);
    expect(isContractWalletCode(null)).toBe(false);
    expect(isContractWalletCode("0x")).toBe(false);
  });

  it("treats an EIP-7702 delegation as an EOA", () => {
    expect(
      isContractWalletCode("0xef01008e8e658e22b12ada97b402ff0b044d6a325013c7"),
    ).toBe(false);
    expect(
      isContractWalletCode("0xEF01008E8E658E22B12ADA97B402FF0B044D6A325013C7"),
    ).toBe(false);
  });

  it("treats other code as a contract wallet", () => {
    expect(isContractWalletCode("0x608060405234801561001057600080fd5b50")).toBe(true);
  });
});

describe("outpostIdentity", () => {
  it("is empty without a wallet", () => {
    expect(outpostIdentity({ codeLoading: false })).toEqual({
      address: undefined,
      isSmartAccount: false,
      isContractWallet: false,
      isLoading: false,
    });
  });

  it("holds the address while the code loads", () => {
    expect(
      outpostIdentity({ owner, smartAccount, codeLoading: true }),
    ).toMatchObject({ address: undefined, isLoading: true });
  });

  it("uses the Light Account for an EOA", () => {
    expect(
      outpostIdentity({ owner, smartAccount, code: undefined, codeLoading: false }),
    ).toEqual({
      address: smartAccount,
      isSmartAccount: true,
      isContractWallet: false,
      isLoading: false,
    });
  });

  it("uses the Light Account for a 7702-delegated EOA", () => {
    expect(
      outpostIdentity({
        owner,
        smartAccount,
        code: "0xef01000000000000000000000000000000000000000001",
        codeLoading: false,
      }).address,
    ).toBe(smartAccount);
  });

  it("keeps a contract wallet as its own identity", () => {
    expect(
      outpostIdentity({ owner, smartAccount, code: "0x6080", codeLoading: false }),
    ).toEqual({
      address: owner,
      isSmartAccount: false,
      isContractWallet: true,
      isLoading: false,
    });
  });

  it("treats the Safe connector as a contract wallet before its code loads", () => {
    expect(
      outpostIdentity({ owner, smartAccount, codeLoading: true, connectorId: "safe" }),
    ).toMatchObject({ address: owner, isContractWallet: true, isLoading: false });
  });

  it("treats an undeployed Base Account as a contract wallet", () => {
    for (const connectorId of ["baseAccount", "app.base.account"]) {
      expect(
        outpostIdentity({ owner, smartAccount, code: undefined, codeLoading: false, connectorId }),
      ).toMatchObject({ address: owner, isSmartAccount: false, isContractWallet: true });
    }
  });
});

describe("callShape", () => {
  it("sponsors createProfile on badges", () => {
    expect(
      callShape({ chainId: SEPOLIA, to: badges, data: encodeCreateProfile("ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy") }),
    ).toEqual({ relayable: true, sponsored: true });
  });

  it("relays but does not sponsor other badges calls", () => {
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "burn",
          stateMutability: "nonpayable",
          inputs: [{ name: "id", type: "uint256" }],
          outputs: [],
        },
      ],
      functionName: "burn",
      args: [BigInt(1)],
    });
    expect(callShape({ chainId: SEPOLIA, to: badges, data })).toEqual({
      relayable: true,
      sponsored: false,
    });
    expect(callShape({ chainId: SEPOLIA, to: registry, data })).toEqual({
      relayable: true,
      sponsored: false,
    });
  });

  it("does not relay other contracts, ETH transfers or other chains", () => {
    const data = encodeCreateProfile("ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy");
    expect(callShape({ chainId: SEPOLIA, to: other, data })).toEqual({
      relayable: false,
      sponsored: false,
    });
    expect(
      callShape({ chainId: SEPOLIA, to: badges, data, value: BigInt(1) }),
    ).toEqual({ relayable: false, sponsored: false });
    expect(callShape({ chainId: 8453, to: badges, data })).toEqual({
      relayable: false,
      sponsored: false,
    });
  });
});

const quote = (overrides: Partial<{ deployed: boolean; costWei: bigint; ownerBalance: bigint }> = {}) => ({
  deployed: true,
  gas: BigInt(100_000),
  costWei: parseEther("0.0001"),
  ownerBalance: parseEther("1"),
  ...overrides,
});

describe("chooseWriteSender", () => {
  it("uses the wallet when no owner is connected", () => {
    expect(chooseWriteSender({ ...base, owner: undefined })).toEqual({
      kind: "owner",
      sender: undefined,
      payer: undefined,
      sponsor: false,
    });
  });

  it("uses the wallet when there is no Light Account", () => {
    expect(chooseWriteSender({ ...base, smartAccount: undefined })).toEqual({
      kind: "owner",
      sender: owner,
      payer: owner,
      sponsor: false,
    });
  });

  it("uses a contract wallet directly, even for sponsored calls", () => {
    expect(
      chooseWriteSender({ ...base, isContractWallet: true, sponsored: true }),
    ).toEqual({ kind: "owner", sender: owner, payer: owner, sponsor: false });
  });

  it("uses the wallet for calls the Light Account cannot relay", () => {
    expect(chooseWriteSender({ ...base, relayable: false })).toEqual({
      kind: "owner",
      sender: owner,
      payer: owner,
      sponsor: false,
    });
  });

  it("always sponsors sponsored calls from the Light Account", () => {
    expect(
      chooseWriteSender({
        ...base,
        sponsored: true,
        smartAccountSimulation: fail(),
      }),
    ).toEqual({ kind: "sponsored", sender: smartAccount, sponsor: true });
  });

  it("acts as the Light Account with the wallet paying when the call succeeds as it", () => {
    expect(
      chooseWriteSender({
        ...base,
        smartAccountSimulation: ok,
        ownerSimulation: ok,
        ownerPays: quote(),
      }),
    ).toEqual({
      kind: "owner-through-account",
      sender: smartAccount,
      payer: owner,
      sponsor: false,
      gasWei: parseEther("0.0001"),
      deploysAccount: false,
    });
  });

  it("never acts as the wallet when both could act", () => {
    // createBadge and similar calls have no sender gate: sending them from
    // the wallet would record the badge under the wallet, not the identity.
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: ok,
      ownerSimulation: ok,
      ownerPays: quote({ deployed: false }),
    });
    expect(route).toMatchObject({
      kind: "owner-through-account",
      sender: smartAccount,
      payer: owner,
      deploysAccount: true,
    });
  });

  it("does not need the Light Account to hold any ETH", () => {
    // The route has no input for the Light Account's balance at all.
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: ok,
      ownerSimulation: fail(),
      ownerPays: quote(),
    });
    expect(route.kind).toBe("owner-through-account");
    expect(JSON.stringify(route, (_, v) => (typeof v === "bigint" ? v.toString() : v))).not.toMatch(
      /Society account|send ETH/i,
    );
  });

  it("uses the wallet directly when only the wallet holds the right", () => {
    expect(
      chooseWriteSender({
        ...base,
        smartAccountSimulation: fail(),
        ownerSimulation: ok,
        ownerPays: quote(),
      }),
    ).toEqual({ kind: "owner", sender: owner, payer: owner, sponsor: false });
  });

  it("does not move the call to the wallet when the Light Account check got no answer", () => {
    // createBadge and the like succeed as either account. A timeout on the
    // Light Account simulation must not record the action under the wallet.
    const timeout = new HttpRequestError({ url: "https://rpc.example", details: "timed out" });
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: fail(timeout),
      ownerSimulation: ok,
      ownerPays: quote(),
    });
    expect(route).toMatchObject({
      kind: "blocked",
      sender: smartAccount,
      sponsor: false,
      message: ROUTE_UNCHECKED_MESSAGE,
    });
    expect((route.error as Error).cause).toBe(timeout);
  });

  it("treats viem's contract revert as the Light Account lacking the right", () => {
    const revert = new BaseError("The contract function reverted.", {
      cause: new ContractFunctionRevertedError({ abi: [], functionName: "burn", message: "nope" }),
    });
    expect(
      chooseWriteSender({
        ...base,
        smartAccountSimulation: fail(revert),
        ownerSimulation: ok,
      }).kind,
    ).toBe("owner");
  });

  it("names the wallet, not the Light Account, when the wallet is short", () => {
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: ok,
      ownerSimulation: fail(),
      ownerPays: quote({ costWei: parseEther("0.003"), ownerBalance: parseEther("0.001") }),
    });
    expect(route).toMatchObject({
      kind: "blocked",
      sender: smartAccount,
      payer: owner,
      gasWei: parseEther("0.003"),
    });
    expect(route.message).toBe(
      `Your wallet ${owner} needs about 0.003 ETH to pay the network fee for this action`,
    );
    expect(route.message).toBe(walletNeedsEthMessage(owner, parseEther("0.003")));
    expect(route.message).not.toContain(smartAccount);
  });

  it("does not block when the wallet's balance could not be read", () => {
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: ok,
      ownerSimulation: ok,
      ownerPays: { ...quote(), ownerBalance: undefined },
    });
    expect(route.kind).toBe("owner-through-account");
  });

  it("does not claim a shortfall when the fee could not be estimated", () => {
    const readError = new Error("rpc down");
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: ok,
      ownerSimulation: ok,
      quoteError: readError,
    });
    expect(route.kind).toBe("blocked");
    expect(route.message).toBe(gasUnknownMessage());
    expect((route.error as Error).message).toBe(gasUnknownMessage());
    expect((route.error as Error).cause).toBe(readError);
  });

  it("reports the Light Account's revert when both accounts fail", () => {
    const smartError = new Error("smart");
    expect(
      chooseWriteSender({
        ...base,
        smartAccountSimulation: fail(smartError),
        ownerSimulation: fail(new Error("owner")),
        ownerPays: quote(),
      }),
    ).toEqual({
      kind: "blocked",
      sender: smartAccount,
      sponsor: false,
      error: smartError,
      message: undefined,
    });
  });

  it("blocks with a generic message when nothing was simulated", () => {
    expect(chooseWriteSender(base)).toMatchObject({
      kind: "blocked",
      message: "This action would fail",
    });
  });
});

const burnAbi = [
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
] as const;

const GAS_PRICE = BigInt(1_000_000_000);

function fakeClient(options: {
  gasFails?: boolean;
  smartReverts?: boolean;
  /** The Light Account simulation fails without an answer from the contract. */
  smartTimesOut?: boolean;
  ownerReverts?: boolean;
  /** The owner wallet's ETH. */
  ownerBalance?: bigint;
  /** The Light Account's ETH: must never matter. */
  smartAccountBalance?: bigint;
  deployed?: boolean;
}) {
  const reverts = (account: unknown) =>
    (account === smartAccount && options.smartReverts) ||
    (account === owner && options.ownerReverts);
  return {
    simulateContract: vi.fn(async ({ account }: { account: unknown }) => {
      if (account === smartAccount && options.smartTimesOut) {
        throw new HttpRequestError({ url: "https://rpc.example", details: "fetch failed" });
      }
      if (reverts(account)) throw new Error("execution reverted");
      return { result: undefined, request: {} };
    }),
    estimateGas: vi.fn(async ({ account, to }: { account: unknown; to: unknown }) => {
      if (options.gasFails) throw new Error("estimate timed out");
      // The owner's transaction to the Light Account runs the call as it.
      if (to === smartAccount && options.smartReverts) throw new Error("execution reverted");
      if (to === LIGHT_ACCOUNT_FACTORY) return BigInt(150_000);
      if (to === smartAccount) return BigInt(70_000);
      if (reverts(account)) throw new Error("execution reverted");
      return BigInt(50_000);
    }),
    getGasPrice: vi.fn(async () => GAS_PRICE),
    getBalance: vi.fn(async ({ address }: { address: unknown }) =>
      address === owner
        ? (options.ownerBalance ?? parseEther("1"))
        : (options.smartAccountBalance ?? BigInt(0)),
    ),
    getCode: vi.fn(async () => (options.deployed ? "0x6080" : undefined)),
  } as unknown as RoutingClient & Record<string, ReturnType<typeof vi.fn>>;
}

const burnCall = {
  chainId: SEPOLIA,
  to: badges,
  abi: burnAbi,
  functionName: "burn",
  args: [BigInt(1)],
  owner,
  smartAccount,
  isContractWallet: false,
};

describe("resolveOutpostRoute", () => {
  it("does not touch the chain for sponsored calls", async () => {
    const client = fakeClient({});
    const route = await resolveOutpostRoute(client, {
      ...burnCall,
      abi: [
        {
          type: "function",
          name: "createProfile",
          stateMutability: "nonpayable",
          inputs: [{ name: "metadataURI", type: "string" }],
          outputs: [],
        },
      ],
      functionName: "createProfile",
      args: ["ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy"],
    });
    expect(route.kind).toBe("sponsored");
    expect(client.simulateContract).not.toHaveBeenCalled();
  });

  it("does not touch the chain for contract wallets", async () => {
    const client = fakeClient({});
    const route = await resolveOutpostRoute(client, { ...burnCall, isContractWallet: true });
    expect(route).toEqual({ kind: "owner", sender: owner, payer: owner, sponsor: false });
    expect(client.simulateContract).not.toHaveBeenCalled();
  });

  it("routes an unsponsored call through a deployed Light Account, priced for the wallet", async () => {
    const client = fakeClient({ deployed: true });
    const route = await resolveOutpostRoute(client, burnCall);
    // 70k gas for the owner's execute transaction at 1 gwei.
    expect(route).toEqual({
      kind: "owner-through-account",
      sender: smartAccount,
      payer: owner,
      sponsor: false,
      gasWei: BigInt(70_000) * GAS_PRICE,
      deploysAccount: false,
    });
    expect(client.estimateGas).toHaveBeenCalledWith(
      expect.objectContaining({ account: owner, to: smartAccount }),
    );
  });

  it("adds the deployment when the Light Account has no code yet", async () => {
    const client = fakeClient({});
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route).toMatchObject({
      kind: "owner-through-account",
      deploysAccount: true,
      gasWei: (BigInt(150_000) + BigInt(50_000) + EXECUTE_OVERHEAD_GAS) * GAS_PRICE,
    });
    expect(client.estimateGas).toHaveBeenCalledWith(
      expect.objectContaining({ account: owner, to: LIGHT_ACCOUNT_FACTORY }),
    );
  });

  it("never reads or needs the Light Account's ETH", async () => {
    const client = fakeClient({ deployed: true, smartAccountBalance: BigInt(0) });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route.kind).toBe("owner-through-account");
    expect(client.getBalance).toHaveBeenCalledTimes(1);
    expect(client.getBalance).toHaveBeenCalledWith({ address: owner });
  });

  it("sends from the wallet directly when the Light Account lacks the right", async () => {
    const client = fakeClient({ smartReverts: true, deployed: true });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route).toEqual({ kind: "owner", sender: owner, payer: owner, sponsor: false });
  });

  it("blocks instead of sending from the wallet when the Light Account check fails to load", async () => {
    const client = fakeClient({ smartTimesOut: true, deployed: true });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route.kind).toBe("blocked");
    expect(route.message).toBe(ROUTE_UNCHECKED_MESSAGE);
  });

  it("names the wallet and the ETH it needs when the wallet is short", async () => {
    const client = fakeClient({ ownerReverts: true, deployed: true, ownerBalance: BigInt(1) });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route.kind).toBe("blocked");
    expect(route.message).toBe(walletNeedsEthMessage(owner, BigInt(70_000) * GAS_PRICE));
  });

  it("reports a failed gas estimate instead of a funding shortfall", async () => {
    const client = fakeClient({ gasFails: true, deployed: true });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route.kind).toBe("blocked");
    expect(route.message).toBe(gasUnknownMessage());
    expect(((route.error as Error).cause as Error).message).toBe("estimate timed out");
  });
});
