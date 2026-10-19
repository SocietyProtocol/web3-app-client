import { describe, expect, it, vi } from "vitest";
import { encodeFunctionData, getAddress, parseEther } from "viem";
import { contracts } from "@/consts/contracts";
import { encodeCreateProfile, lightAccountAddress } from "@/lib/smart-account";
import {
  RoutingClient,
  callShape,
  chooseWriteSender,
  estimateUserOperationPrefund,
  formatEthCeil,
  fundsUnknownMessage,
  insufficientFundsMessage,
  isContractWalletCode,
  outpostIdentity,
  resolveOutpostRoute,
} from "@/lib/outpost-routing";

const SEPOLIA = 11155111;
const owner = getAddress("0x00000000000000000000000000000000000000e0");
const smartAccount = lightAccountAddress(owner);
const badges = contracts.badges.sepolia;
const registry = contracts.communityRegistry.sepolia;
const other = getAddress("0x00000000000000000000000000000000000000aa");

const ok = { ok: true } as const;
const fail = (error: unknown = new Error("reverted")) =>
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

describe("estimateUserOperationPrefund", () => {
  it("adds verification and pre-verification gas", () => {
    const fee = BigInt(10);
    expect(
      estimateUserOperationPrefund({ callGas: BigInt(100_000), deployed: true, maxFeePerGas: fee }),
    ).toBe(BigInt(120_000 + 120_000 + 60_000) * fee);
    expect(
      estimateUserOperationPrefund({ callGas: BigInt(100_000), deployed: false, maxFeePerGas: fee }),
    ).toBe(BigInt(120_000 + 400_000 + 60_000) * fee);
  });
});

describe("formatEthCeil", () => {
  it("rounds up to five decimals", () => {
    expect(formatEthCeil(BigInt(1))).toBe("0.00001");
    expect(formatEthCeil(parseEther("0.000012"))).toBe("0.00002");
    expect(formatEthCeil(parseEther("0.5"))).toBe("0.5");
  });
});

describe("chooseWriteSender", () => {
  it("uses the wallet when no owner is connected", () => {
    expect(chooseWriteSender({ ...base, owner: undefined })).toEqual({
      kind: "owner",
      sender: undefined,
      sponsor: false,
    });
  });

  it("uses the wallet when there is no Light Account", () => {
    expect(chooseWriteSender({ ...base, smartAccount: undefined })).toEqual({
      kind: "owner",
      sender: owner,
      sponsor: false,
    });
  });

  it("uses a contract wallet directly, even for sponsored calls", () => {
    expect(
      chooseWriteSender({ ...base, isContractWallet: true, sponsored: true }),
    ).toEqual({ kind: "owner", sender: owner, sponsor: false });
  });

  it("uses the wallet for calls the Light Account cannot relay", () => {
    expect(chooseWriteSender({ ...base, relayable: false })).toEqual({
      kind: "owner",
      sender: owner,
      sponsor: false,
    });
  });

  it("always sponsors sponsored calls from the Light Account", () => {
    expect(
      chooseWriteSender({
        ...base,
        sponsored: true,
        smartAccountSimulation: fail(),
        smartAccountFunds: BigInt(0),
      }),
    ).toEqual({ kind: "sponsored", sender: smartAccount, sponsor: true });
  });

  it("uses the Light Account when it succeeds and can pay", () => {
    expect(
      chooseWriteSender({
        ...base,
        smartAccountSimulation: ok,
        ownerSimulation: ok,
        smartAccountFunds: BigInt(100),
        prefundWei: BigInt(100),
      }),
    ).toEqual({
      kind: "smart-account",
      sender: smartAccount,
      sponsor: false,
      prefundWei: BigInt(100),
    });
  });

  it("asks for ETH instead of acting as the wallet when both could act", () => {
    // createBadge and similar calls have no sender gate: sending them from
    // the wallet would record the badge under the wallet, not the identity.
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: ok,
      ownerSimulation: ok,
      smartAccountFunds: BigInt(0),
      prefundWei: BigInt(100),
    });
    expect(route).toMatchObject({ kind: "blocked", sender: smartAccount });
    expect(route.message).toBe(insufficientFundsMessage(smartAccount, BigInt(100)));
  });

  it("uses the wallet when only the wallet holds the right", () => {
    expect(
      chooseWriteSender({
        ...base,
        smartAccountSimulation: fail(),
        ownerSimulation: ok,
        smartAccountFunds: parseEther("1"),
        prefundWei: BigInt(100),
      }),
    ).toEqual({ kind: "owner", sender: owner, sponsor: false });
  });

  it("asks for ETH when only the Light Account can act and it is short", () => {
    const route = chooseWriteSender({
      ...base,
      smartAccountSimulation: ok,
      ownerSimulation: fail(),
      smartAccountFunds: parseEther("0.001"),
      prefundWei: parseEther("0.003"),
    });
    expect(route).toMatchObject({
      kind: "blocked",
      sender: smartAccount,
      prefundWei: parseEther("0.003"),
    });
    expect(route.message).toBe(
      `Your Society account ${smartAccount} needs ~0.002 ETH for this action; send ETH to it from your wallet or ask an admin`,
    );
  });

  it("does not claim a shortfall when the prefund or balance is unknown", () => {
    const readError = new Error("rpc down");
    for (const reads of [
      { smartAccountFunds: parseEther("1") },
      { prefundWei: BigInt(100) },
    ]) {
      const route = chooseWriteSender({
        ...base,
        smartAccountSimulation: ok,
        ownerSimulation: ok,
        fundsReadError: readError,
        ...reads,
      });
      expect(route.kind).toBe("blocked");
      expect(route.message).toBe(fundsUnknownMessage(smartAccount));
      expect((route.error as Error).message).toBe(fundsUnknownMessage(smartAccount));
      expect((route.error as Error).cause).toBe(readError);
    }
  });

  it("reports the Light Account's revert when both accounts fail", () => {
    const smartError = new Error("smart");
    expect(
      chooseWriteSender({
        ...base,
        smartAccountSimulation: fail(smartError),
        ownerSimulation: fail(new Error("owner")),
        smartAccountFunds: parseEther("1"),
        prefundWei: BigInt(1),
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

function fakeClient(options: {
  gasFails?: boolean;
  smartReverts?: boolean;
  ownerReverts?: boolean;
  balance?: bigint;
  deposit?: bigint;
  deployed?: boolean;
}) {
  const reverts = (account: unknown) =>
    (account === smartAccount && options.smartReverts) ||
    (account === owner && options.ownerReverts);
  return {
    simulateContract: vi.fn(async ({ account }: { account: unknown }) => {
      if (reverts(account)) throw new Error("execution reverted");
      return { result: undefined, request: {} };
    }),
    estimateContractGas: vi.fn(async ({ account }: { account: unknown }) => {
      if (options.gasFails) throw new Error("estimate timed out");
      if (reverts(account)) throw new Error("execution reverted");
      return BigInt(50_000);
    }),
    getBalance: vi.fn(async () => options.balance ?? BigInt(0)),
    readContract: vi.fn(async () => options.deposit ?? BigInt(0)),
    getCode: vi.fn(async () => (options.deployed ? "0x6080" : undefined)),
    estimateFeesPerGas: vi.fn(async () => ({
      maxFeePerGas: BigInt(1_000_000_000),
      maxPriorityFeePerGas: BigInt(1),
    })),
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
    expect(route).toEqual({ kind: "owner", sender: owner, sponsor: false });
    expect(client.simulateContract).not.toHaveBeenCalled();
  });

  it("sends from a funded Light Account, counting its EntryPoint deposit", async () => {
    // 1 gwei * (60k + 400k + 60k) = 0.00052 ETH
    const client = fakeClient({
      balance: parseEther("0.0003"),
      deposit: parseEther("0.0003"),
    });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route).toMatchObject({
      kind: "smart-account",
      sender: smartAccount,
      prefundWei: parseEther("0.00052"),
    });
  });

  it("uses a cheaper prefund once the Light Account is deployed", async () => {
    const client = fakeClient({ balance: parseEther("0.00024"), deployed: true });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route).toMatchObject({ kind: "smart-account", prefundWei: parseEther("0.00024") });
  });

  it("sends from the wallet when the Light Account lacks the right", async () => {
    const client = fakeClient({ smartReverts: true, balance: parseEther("1") });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route).toEqual({ kind: "owner", sender: owner, sponsor: false });
  });

  it("names the Light Account and the ETH it needs", async () => {
    const client = fakeClient({ ownerReverts: true });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route.kind).toBe("blocked");
    expect(route.message).toBe(
      insufficientFundsMessage(smartAccount, parseEther("0.00052")),
    );
  });

  it("reports a failed gas estimate instead of a funding shortfall", async () => {
    const client = fakeClient({ gasFails: true, balance: parseEther("1") });
    const route = await resolveOutpostRoute(client, burnCall);
    expect(route.kind).toBe("blocked");
    expect(route.message).toBe(fundsUnknownMessage(smartAccount));
    expect(((route.error as Error).cause as Error).message).toBe("estimate timed out");
  });
});
