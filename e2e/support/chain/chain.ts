import { createSmartAccountClient } from "permissionless";
import { toLightSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  getAbiItem,
  http,
  isAddressEqual,
  keccak256,
  numberToHex,
  parseEther,
  TransactionReceiptNotFoundError,
  zeroAddress,
  type Abi,
  type Address,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type ContractFunctionReturnType,
  type Hex,
  type LocalAccount,
  type TransactionReceipt,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import {
  LIGHT_ACCOUNT_FACTORY,
  encodeCreateAccount,
  lightAccountAddress,
} from "../../../src/lib/smart-account";
import { BADGES_ADDRESS, BADGES_START_BLOCK, KEY_INDEX, URLS } from "../../env/hermetic";
import type { SubgraphFake } from "../backends/subgraph";
import { testAccount } from "../wallet/keys";

type BadgesAbi = typeof SocietyProtocolBadgesABI;
type BadgesRead = ContractFunctionName<BadgesAbi, "view" | "pure">;
type BadgesWrite = ContractFunctionName<BadgesAbi, "nonpayable" | "payable">;

export type Call = { to: Address; data: Hex; value?: bigint };

const POLL_MS = 100;
const RECEIPT_TIMEOUT_MS = 60_000;

/**
 * Where an ERC-20 token may keep `balances[holder]`: a mapping at one of the
 * first storage slots (OpenZeppelin 4 uses 0, solmate and WETH9 3, Circle's
 * FiatToken 9), at 51 or 101 (upgradeable OpenZeppelin 4), or at the fixed
 * location of OpenZeppelin 5's upgradeable ERC20 (ERC-7201
 * "openzeppelin.storage.ERC20").
 */
const ERC20_BALANCE_SLOTS: Hex[] = [
  ...Array.from({ length: 16 }, (_, slot) => numberToHex(slot, { size: 32 })),
  numberToHex(51, { size: 32 }),
  numberToHex(101, { size: 32 }),
  "0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace00",
];
type MappingLayout = "solidity" | "vyper";

/** The storage key of `mapping[holder]` at `slot`. Vyper hashes the slot first and the key second. */
function mappingKey(holder: Address, slot: Hex, layout: MappingLayout): Hex {
  return layout === "solidity"
    ? keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes32" }], [holder, slot]))
    : keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "address" }], [slot, holder]));
}

/**
 * The local chain (an Anvil fork of Sepolia) as the tests see it: reads for
 * assertions, and writes for seeding state before a test acts.
 *
 * The chain is shared by every test of a run and is never reverted, so a
 * test must only depend on state it created for its own fresh accounts.
 */
export class Chain {
  readonly public = createPublicClient({
    chain: sepolia,
    transport: http(URLS.anvil),
    pollingInterval: POLL_MS,
  });
  readonly anvil = createTestClient({ mode: "anvil", chain: sepolia, transport: http(URLS.anvil) });
  /** A funded test key, for seeding transactions that anyone may send. */
  readonly funder = testAccount(KEY_INDEX.funder);

  /** Per token: where its balances were found (see setErc20Balance). */
  private readonly erc20BalanceSlots = new Map<string, { slot: Hex; layout: MappingLayout }>();

  constructor(private readonly subgraph: SubgraphFake) {}

  // ---- reads --------------------------------------------------------------

  /** Reads the badges contract: chain.read("balanceOf", [account, id]). */
  read<Name extends BadgesRead, Args extends ContractFunctionArgs<BadgesAbi, "view" | "pure", Name>>(
    functionName: Name,
    args?: Args,
  ): Promise<ContractFunctionReturnType<BadgesAbi, "view" | "pure", Name, Args>> {
    return this.public.readContract({
      address: BADGES_ADDRESS,
      abi: SocietyProtocolBadgesABI,
      functionName,
      args,
    } as never) as Promise<ContractFunctionReturnType<BadgesAbi, "view" | "pure", Name, Args>>;
  }

  /** The id of the account's profile badge; 0n when it has no profile. */
  profileBadgeId(account: Address): Promise<bigint> {
    return this.read("profileBadgeId", [account]);
  }

  /** How many of badge `id` the account holds. */
  badgeBalance(account: Address, id: bigint | string): Promise<bigint> {
    return this.read("balanceOf", [account, BigInt(id)]);
  }

  /** Total supply of badge `id`. */
  async badgeTotalSupply(id: bigint | string): Promise<bigint> {
    return (await this.public.readContract({
      address: BADGES_ADDRESS,
      abi: SocietyProtocolBadgesABI,
      functionName: "totalSupply",
      args: [BigInt(id)],
    })) as bigint;
  }

  balance(address: Address): Promise<bigint> {
    return this.public.getBalance({ address });
  }

  /** The holder's balance of an ERC-20 token, in the token's smallest unit. */
  erc20Balance(token: Address, holder: Address): Promise<bigint> {
    return this.public.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [holder] });
  }

  async isContract(address: Address): Promise<boolean> {
    const code = await this.public.getCode({ address });
    return !!code && code !== "0x";
  }

  /** The Society address (Light Account v2, salt 0) of an owner wallet. */
  societyAddress(owner: Address): Address {
    return lightAccountAddress(owner);
  }

  blockNumber(): Promise<bigint> {
    return this.public.getBlockNumber();
  }

  /**
   * Waits for the transaction and fails when it reverted. The local chain
   * mines at once, so a minute without a receipt means it never will: fail
   * with the hash rather than leave the test to its own timeout.
   */
  async receipt(hash: Hex): Promise<TransactionReceipt> {
    const receipt = await this.receiptOf(hash);
    if (receipt.status !== "success") throw new Error(`Transaction ${hash} reverted`);
    return receipt;
  }

  /**
   * The transaction's receipt, whether it succeeded or reverted.
   *
   * Asks for the receipt itself until it is there, instead of viem's
   * waitForTransactionReceipt: two of those for the same hash on one client
   * (two seeding calls whose user operations went into the same bundle)
   * share one block watcher, and on a chain that mines no further block the
   * second can wait until it times out although the transaction is mined.
   */
  async receiptOf(hash: Hex): Promise<TransactionReceipt> {
    const deadline = Date.now() + RECEIPT_TIMEOUT_MS;
    for (;;) {
      try {
        return await this.public.getTransactionReceipt({ hash });
      } catch (error) {
        if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
      }
      if (Date.now() > deadline) {
        throw new Error(`Transaction ${hash} has no receipt after ${RECEIPT_TIMEOUT_MS / 1000} s`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }

  // ---- writes, for seeding --------------------------------------------------

  /** Sets the ETH balance of any address, in ether. */
  async setBalance(address: Address, ether: string | number) {
    await this.anvil.setBalance({ address, value: parseEther(String(ether)) });
  }

  /**
   * Makes `holder`'s balance of the ERC-20 `token` exactly `amount` (in the
   * token's smallest unit), by writing the token's storage on the fork:
   * what Foundry's `deal` does. The total supply is left as it is; nothing
   * the app shows reads it.
   *
   * The storage slot is found by trying the usual layouts and reading
   * `balanceOf` back; a wrong guess is put back as it was. Throws when none
   * of them is the balance: that token then needs its own seeding (a mint
   * as its owner).
   */
  async setErc20Balance(token: Address, holder: Address, amount: bigint): Promise<void> {
    if ((await this.erc20Balance(token, holder)) === amount) return;
    const value = numberToHex(amount, { size: 32 });

    const known = this.erc20BalanceSlots.get(token.toLowerCase());
    if (known) {
      await this.anvil.setStorageAt({ address: token, index: mappingKey(holder, known.slot, known.layout), value });
      if ((await this.erc20Balance(token, holder)) === amount) return;
    }

    for (const slot of ERC20_BALANCE_SLOTS) {
      for (const layout of ["solidity", "vyper"] as const) {
        const index = mappingKey(holder, slot, layout);
        const before = (await this.public.getStorageAt({ address: token, slot: index })) ?? numberToHex(0, { size: 32 });
        await this.anvil.setStorageAt({ address: token, index, value });
        if ((await this.erc20Balance(token, holder)) === amount) {
          this.erc20BalanceSlots.set(token.toLowerCase(), { slot, layout });
          return;
        }
        await this.anvil.setStorageAt({ address: token, index, value: before });
      }
    }
    throw new Error(
      `Could not set the balance of token ${token}: none of the storage layouts Chain.setErc20Balance knows ` +
        "holds its balances. Seed it another way (a mint as the token's owner).",
    );
  }

  /**
   * Sends one transaction as `from` without its key (Anvil impersonation):
   * a role holder on the fork, or a Light Account acting for itself. The
   * account's balance is put back afterwards, so a Light Account that held
   * no ETH still holds none.
   */
  async sendAs(from: Address, call: Call): Promise<TransactionReceipt> {
    const before = await this.balance(from);
    await this.anvil.setBalance({ address: from, value: parseEther("10") });
    await this.anvil.impersonateAccount({ address: from });
    try {
      const hash = await this.anvil.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: call.to,
            data: call.data,
            ...(call.value ? { value: `0x${call.value.toString(16)}` as Hex } : {}),
          },
        ],
      } as never);
      return await this.receipt(hash as Hex);
    } finally {
      await this.anvil.stopImpersonatingAccount({ address: from });
      await this.anvil.setBalance({ address: from, value: before });
    }
  }

  /** Calls the badges contract as `from` (impersonated). */
  writeBadgesAs<Name extends BadgesWrite>(
    from: Address,
    functionName: Name,
    args: ContractFunctionArgs<BadgesAbi, "nonpayable" | "payable", Name>,
  ): Promise<TransactionReceipt> {
    return this.sendAs(from, {
      to: BADGES_ADDRESS,
      data: encodeFunctionData({ abi: SocietyProtocolBadgesABI as Abi, functionName, args } as never),
    });
  }

  /** Sends a transaction from the funded test key. */
  async sendFromFunder(call: Call): Promise<TransactionReceipt> {
    const client = createWalletClient({ account: this.funder, chain: sepolia, transport: http(URLS.anvil) });
    const hash = await client.sendTransaction({ to: call.to, data: call.data, value: call.value });
    return this.receipt(hash);
  }

  /** Deploys the owner's Light Account through the factory, if it is not deployed yet. */
  async deployLightAccount(owner: Address): Promise<Address> {
    const account = this.societyAddress(owner);
    if (!(await this.isContract(account))) {
      await this.sendFromFunder({ to: LIGHT_ACCOUNT_FACTORY, data: encodeCreateAccount(owner) });
    }
    return account;
  }

  /**
   * Sends calls from the owner's Light Account as a sponsored user
   * operation, straight to the local paymaster and bundler (not through the
   * app's /api/aa/rpc proxy, so it spends none of a test's rate limit).
   * Like the app's first sponsored write, it deploys the account if needed.
   */
  async sendSponsored(owner: LocalAccount, calls: Call[]): Promise<TransactionReceipt> {
    const entryPoint = { address: entryPoint07Address, version: "0.7" } as const;
    const account = await toLightSmartAccount({
      client: this.public,
      owner,
      version: "2.0.0",
      entryPoint,
    });
    const paymaster = createPimlicoClient({ chain: sepolia, transport: http(URLS.paymaster), entryPoint });
    const client = createSmartAccountClient({
      account,
      chain: sepolia,
      client: this.public,
      bundlerTransport: http(URLS.paymaster),
      paymaster,
      pollingInterval: POLL_MS,
      userOperation: {
        estimateFeesPerGas: async () => (await paymaster.getUserOperationGasPrice()).fast,
      },
    });
    const hash = await client.sendTransaction({
      calls: calls.map((call) => ({ to: call.to, data: call.data, value: call.value ?? BigInt(0) })),
    });
    return this.receipt(hash);
  }

  /**
   * An account that the contract lets act under one of the permission
   * rules, or undefined. A rule is the id of a badge whose holders may act,
   * or one of two markers: PERM_EVERYONE (anyone may) and PERM_SELF (an
   * account may act for itself; checked on the fork for minting to oneself).
   */
  private async accountAllowedBy(rules: readonly bigint[], self: Address): Promise<Address | undefined> {
    const [permSelf, permEveryone] = await Promise.all([this.read("PERM_SELF"), this.read("PERM_EVERYONE")]);
    for (const rule of rules) {
      if (rule === permEveryone) return this.funder.address;
      if (rule === permSelf) return self;
      for (const holder of await this.subgraph.holdersOf(rule)) {
        if ((await this.badgeBalance(holder as Address, rule)) > BigInt(0)) return holder as Address;
      }
    }
    return undefined;
  }

  /**
   * Mints a badge to `to` the way the contract allows it: finds an account
   * that may mint it on the fork (a holder of one of its minter badges, or
   * the recipient itself when the badge lets everyone mint their own) and
   * mints as that account. The subgraph fake follows the chain, so the new
   * holder shows up there without an overlay.
   */
  async mintBadge(input: { badgeId: bigint | string; to: Address; amount?: bigint }): Promise<TransactionReceipt> {
    const badgeId = BigInt(input.badgeId);
    const minterBadges = await this.read("getBadgeMinters", [badgeId]);
    const minter = await this.accountAllowedBy(minterBadges, input.to);
    if (!minter) {
      throw new Error(
        `No account on the fork may mint badge ${badgeId}: its minter badges are [${minterBadges.join(", ")}] ` +
          "and the subgraph fake knows no holder of any of them.",
      );
    }
    return this.writeBadgesAs(minter, "mint", [input.to, badgeId, input.amount ?? BigInt(1), "0x"]);
  }

  /**
   * Burns units of a badge held by `from`, as an account that may burn it
   * on the fork (a holder of one of its burner badges, or `from` itself
   * when holders may burn their own).
   */
  async burnBadge(input: { badgeId: bigint | string; from: Address; amount?: bigint }): Promise<TransactionReceipt> {
    const badgeId = BigInt(input.badgeId);
    const burnerBadges = await this.read("getBadgeBurners", [badgeId]);
    const burner = await this.accountAllowedBy(burnerBadges, input.from);
    if (!burner) {
      throw new Error(
        `No account on the fork may burn badge ${badgeId}: its burner badges are [${burnerBadges.join(", ")}] ` +
          "and the subgraph fake knows no holder of any of them.",
      );
    }
    return this.writeBadgesAs(burner, "burn", [input.from, badgeId, input.amount ?? BigInt(1)]);
  }

  /**
   * Creates a badge as `creator` (impersonated) and returns its id. Rules
   * are badge ids: the creator's profile badge means "this member". An
   * official badge needs a creator with OFFICIAL_BADGE_CREATOR_ROLE (the
   * officialBadgeCreator persona).
   */
  async createBadge(input: {
    creator: Address;
    name: string;
    uri: string;
    isOfficial?: boolean;
    minters?: bigint[];
    transferers?: bigint[];
    burners?: bigint[];
    /** Accounts that may edit the badge; the creator when left out. */
    editors?: Address[];
  }): Promise<bigint> {
    const receipt = await this.writeBadgesAs(input.creator, "createBadge", [
      input.name,
      input.isOfficial ?? false,
      false,
      zeroAddress,
      input.uri,
      input.minters ?? [],
      input.transferers ?? [],
      input.burners ?? [],
      input.editors ?? [input.creator],
    ]);
    for (const log of receipt.logs) {
      if (!isAddressEqual(log.address, BADGES_ADDRESS)) continue;
      try {
        const event = decodeEventLog({ abi: SocietyProtocolBadgesABI, data: log.data, topics: log.topics });
        if (event.eventName === "BadgeCreated") return (event.args as { id: bigint }).id;
      } catch {
        // an event this ABI does not know
      }
    }
    throw new Error("createBadge emitted no BadgeCreated event");
  }

  /**
   * Grants one of the badges contract's roles to `account`, as an account
   * that administers the role on the fork. The administrators are found in
   * the RoleGranted events of the contract's first blocks: the deployment
   * grants the roles there.
   */
  async grantBadgesRole(role: "OFFICIAL_BADGE_CREATOR_ROLE" | "COMMUNITY_MANAGER_ROLE", account: Address) {
    const roleId = await this.read(role);
    const adminRole = await this.read("getRoleAdmin", [roleId]);
    const start = BigInt(BADGES_START_BLOCK);
    const granted = await this.public.getLogs({
      address: BADGES_ADDRESS,
      event: getAbiItem({ abi: SocietyProtocolBadgesABI, name: "RoleGranted" }),
      args: { role: adminRole },
      fromBlock: start,
      toBlock: start + BigInt(1_000),
    });
    for (const log of granted) {
      const admin = log.args.account;
      if (admin && (await this.read("hasRole", [adminRole, admin]))) {
        await this.writeBadgesAs(admin, "grantRole", [roleId, account]);
        if (await this.read("hasRole", [roleId, account])) return;
      }
    }
    throw new Error(
      `No account on the fork can grant ${role}: none of the ${granted.length} admins found at the badges ` +
        "contract's deployment still holds the admin role.",
    );
  }
}
