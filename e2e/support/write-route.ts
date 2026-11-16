import { expect } from "@playwright/test";
import {
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  isAddressEqual,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { ChainLinkFeedABI } from "../../src/abis/ChainlinkFeed";
import { contracts } from "../../src/consts/contracts";
import { LIGHT_ACCOUNT_FACTORY, encodeCreateAccount } from "../../src/lib/smart-account";
import type { AaTraffic, SentUserOperation } from "./aa/traffic";
import type { Chain } from "./chain/chain";
import type { Persona } from "./personas";
import type { SeenText } from "./seen-text";
import type { TestWallet } from "./wallet/test-wallet";

/**
 * Checks of who sent and who paid for a write the page just made, from the
 * wallet's request log and the chain. Clear the log (wallet.clearRequests())
 * before the action, so that it holds only what the action asked for.
 */

/**
 * The write went "owner pays through the account": the owner wallet sent
 * one ordinary transaction to its Light Account, which made the call.
 * Checks that
 *   - the wallet was asked for exactly one transaction (two with
 *     `deploysAccount`: first createAccount on the Light Account factory),
 *     for exactly `signatures` signatures, all approved, and for no
 *     EIP-5792 batch;
 *   - the transaction went from the owner wallet to the Light Account and
 *     carried no ETH;
 *   - the owner wallet paid exactly the fees, and the Light Account holds no
 *     ETH afterwards.
 * `ownerBalanceBefore` is the owner wallet's balance read before the action.
 * `signatures` is 0 for a write that is never sponsored (so no user
 * operation was signed) and 1 when the action first signs an upload
 * authentication (a profile save whose sponsorship was refused).
 * Returns the receipt of the Light Account's transaction, for the test to
 * check what the call did.
 */
export async function expectOwnerPaidThroughAccount(
  { wallet, chain }: { wallet: TestWallet; chain: Chain },
  input: { persona: Persona; ownerBalanceBefore: bigint; signatures?: number; deploysAccount?: boolean },
): Promise<TransactionReceipt> {
  const { persona } = input;

  const sends = wallet.sendTransactionRequests();
  expect(
    sends.map((request) => request.outcome),
    input.deploysAccount ? "two transactions, approved" : "one transaction, approved",
  ).toEqual(input.deploysAccount ? ["ok", "ok"] : ["ok"]);
  expect(
    wallet.signatureRequests().map((request) => `${request.method}:${request.outcome}`),
    "signatures the wallet was asked for",
  ).toEqual(Array.from({ length: input.signatures ?? 0 }, () => "personal_sign:ok"));
  expect(wallet.sendCallsRequests(), "no wallet_sendCalls").toHaveLength(0);

  let fees = BigInt(0);
  if (input.deploysAccount) {
    // First the owner deploys its Light Account: createAccount(owner, 0) on the factory.
    const [deploy] = sends[0].params as [{ from?: Address; to?: Address; data?: Hex; value?: Hex }];
    expect(isAddressEqual(deploy.from!, persona.ownerAddress), `deployment sent from ${deploy.from}`).toBe(true);
    expect(isAddressEqual(deploy.to!, LIGHT_ACCOUNT_FACTORY), `deployment sent to ${deploy.to}`).toBe(true);
    expect(deploy.data?.toLowerCase()).toBe(encodeCreateAccount(persona.ownerAddress).toLowerCase());
    expect(BigInt(deploy.value ?? "0x0"), "the deployment carries no ETH").toBe(BigInt(0));
    const deployed = await chain.receipt(sends[0].hash!);
    fees += deployed.gasUsed * deployed.effectiveGasPrice;
  }

  const send = sends[sends.length - 1];
  const [asked] = send.params as [{ from?: Address; to?: Address; value?: Hex }];
  expect(isAddressEqual(asked.from!, persona.ownerAddress), `sent from ${asked.from}`).toBe(true);
  expect(isAddressEqual(asked.to!, persona.address), `sent to ${asked.to}`).toBe(true);
  expect(BigInt(asked.value ?? "0x0"), "carries no ETH").toBe(BigInt(0));

  const receipt = await chain.receipt(send.hash!);
  expect(isAddressEqual(receipt.from, persona.ownerAddress)).toBe(true);
  expect(isAddressEqual(receipt.to!, persona.address)).toBe(true);
  fees += receipt.gasUsed * receipt.effectiveGasPrice;

  const ownerBalanceAfter = await chain.balance(persona.ownerAddress);
  expect(input.ownerBalanceBefore - ownerBalanceAfter, "the owner wallet paid the fees").toBe(fees);
  expect(await chain.balance(persona.address), "the Light Account holds no ETH").toBe(BigInt(0));
  return receipt;
}

/**
 * The write went the "owner" route: the wallet itself made the call, as
 * it does for a right that only the wallet holds. Checks that
 *   - the wallet was asked for exactly one transaction, approved, and for
 *     no signature and no EIP-5792 batch;
 *   - it went from the owner wallet straight to `to` (not to the Light
 *     Account) and carried no ETH;
 *   - the owner wallet paid exactly its fee, and the Light Account holds no ETH.
 * Returns the receipt.
 */
export async function expectOwnerSentDirectly(
  { wallet, chain }: { wallet: TestWallet; chain: Chain },
  input: { persona: Persona; to: Address; ownerBalanceBefore: bigint },
): Promise<TransactionReceipt> {
  const { persona } = input;

  const sends = wallet.sendTransactionRequests();
  expect(
    sends.map((request) => request.outcome),
    "one transaction, approved",
  ).toEqual(["ok"]);
  expect(wallet.signatureRequests(), "no signature request").toHaveLength(0);
  expect(wallet.sendCallsRequests(), "no wallet_sendCalls").toHaveLength(0);

  const [asked] = sends[0].params as [{ from?: Address; to?: Address; value?: Hex }];
  expect(isAddressEqual(asked.from!, persona.ownerAddress), `sent from ${asked.from}`).toBe(true);
  expect(isAddressEqual(asked.to!, input.to), `sent to ${asked.to}`).toBe(true);
  expect(BigInt(asked.value ?? "0x0"), "carries no ETH").toBe(BigInt(0));

  const receipt = await chain.receipt(sends[0].hash!);
  expect(isAddressEqual(receipt.from, persona.ownerAddress)).toBe(true);
  expect(isAddressEqual(receipt.to!, input.to)).toBe(true);

  const ownerBalanceAfter = await chain.balance(persona.ownerAddress);
  expect(input.ownerBalanceBefore - ownerBalanceAfter, "the owner wallet paid the fee").toBe(
    receipt.gasUsed * receipt.effectiveGasPrice,
  );
  expect(await chain.balance(persona.address), "the Light Account holds no ETH").toBe(BigInt(0));
  return receipt;
}

/**
 * The write was sponsored: the wallet only signed, the page submitted one
 * user operation whose sender is the persona's Light Account and which a
 * paymaster pays for, and nobody's ETH moved. Checks that
 *   - the wallet was asked for exactly `signatures` signatures, all
 *     approved, and for no transaction and no EIP-5792 batch;
 *   - the page submitted exactly one user operation, from the Light
 *     Account, with a paymaster;
 *   - the owner wallet's balance is what it was before (`ownerBalanceBefore`)
 *     and the Light Account holds no ETH.
 * Clear both logs before the action (wallet.clearRequests(), aa.clear()).
 * `signatures` is 1 for the user operation alone, 2 when the action first
 * signs an upload authentication (profile create and update).
 * Returns the user operation, for the test to check what it carried.
 */
export async function expectSponsoredThroughAccount(
  { wallet, aa, chain }: { wallet: TestWallet; aa: AaTraffic; chain: Chain },
  input: { persona: Persona; ownerBalanceBefore: bigint; signatures?: number },
): Promise<SentUserOperation> {
  const { persona } = input;

  expect(
    wallet.signatureRequests().map((request) => `${request.method}:${request.outcome}`),
    "signatures the wallet was asked for",
  ).toEqual(Array.from({ length: input.signatures ?? 1 }, () => "personal_sign:ok"));
  expect(wallet.sendTransactionRequests(), "no transaction request").toHaveLength(0);
  expect(wallet.sendCallsRequests(), "no wallet_sendCalls").toHaveLength(0);

  const userOperations = aa.userOperations();
  expect(userOperations, "user operations submitted").toHaveLength(1);
  const [userOperation] = userOperations;
  expect(isAddressEqual(userOperation.sender, persona.address), `sender ${userOperation.sender}`).toBe(true);
  expect(userOperation.paymaster, "a paymaster pays").toMatch(/^0x[0-9a-fA-F]{40}$/);

  expect(await chain.balance(persona.ownerAddress), "the owner wallet paid nothing").toBe(input.ownerBalanceBefore);
  expect(await chain.balance(persona.address), "the Light Account holds no ETH").toBe(BigInt(0));
  return userOperation;
}

// ---- what the wallet is told it will pay -----------------------------------

/** The transaction the wallet was last asked to send, as the app handed it over. */
export function lastTransactionAsked(wallet: TestWallet): { from: Address; to: Address; data: Hex; gas?: Hex } {
  const requests = wallet.sendTransactionRequests();
  const [transaction] = requests[requests.length - 1].params as [{ from: Address; to: Address; data: Hex; gas?: Hex }];
  return transaction;
}

/**
 * What a transaction is expected to cost right now: its gas estimate times
 * the current gas price. This is how the app prices a write the owner
 * wallet pays for, so while the wallet prompt is held (nothing is mined in
 * between) it is the very amount the app showed.
 */
export async function expectedCost(chain: Chain, transaction: { from: Address; to: Address; data: Hex }) {
  const [gas, gasPrice] = await Promise.all([
    chain.public.estimateGas({ account: transaction.from, to: transaction.to, data: transaction.data }),
    chain.public.getGasPrice(),
  ]);
  return gas * gasPrice;
}

/**
 * A fee in wei as the gas label's tooltip states it: in USD at the chain's
 * ETH price feed, eight decimals ("$0.00123456").
 */
export async function feeInUsd(chain: Chain, wei: bigint): Promise<string> {
  const price = await chain.public.readContract({
    address: contracts.chainlinkFeed.sepolia,
    abi: ChainLinkFeedABI,
    functionName: "latestAnswer",
  });
  return `$${formatUnits((wei * price) / BigInt(10) ** BigInt(18), 8)}`;
}

/** An amount of wei the way the app's messages show it: in ETH, rounded up to five decimals. */
export function shownEth(wei: bigint): string {
  const step = BigInt(10) ** BigInt(13);
  return formatEther(((wei + step - BigInt(1)) / step) * step);
}

/** The ETH amount a message names ("about 0.00012 ETH"), in wei. */
export function amountNamed(message: string): bigint {
  const match = /about ([\d.]+) ETH/.exec(message);
  if (!match) throw new Error(`No "about <n> ETH" in: ${message}`);
  const [whole, fraction = ""] = match[1].split(".");
  return BigInt(whole) * BigInt(10) ** BigInt(18) + BigInt(fraction.padEnd(18, "0"));
}

// ---- the Light Account is never funded --------------------------------------

/**
 * Whether a text puts ETH and the Society account together in one
 * sentence: by name ("Society account", "Society address", "smart
 * account", "Light Account") or by the account's address, in full or
 * shortened ("0x1234...abcdef"). That is what a request to fund the account
 * looks like, such as the message the app used to show: "Your Society
 * account 0x... needs ~0.002 ETH for this action; send ETH to it from your
 * wallet or ask an admin". Sentences end at ". ", ";", ":", "!" or "?".
 *
 * Messages about the wallet's ETH ("Your wallet 0x... needs about 0.0001
 * ETH to pay the network fee") do not match, and neither does a notice
 * whose ETH amount and whose mention of the Society account are in
 * different sentences.
 */
export function mentionsEthWithSocietyAccount(text: string, societyAddress: Address): boolean {
  const address = societyAddress.toLowerCase();
  const shortened = new RegExp(`${address.slice(0, 6)}(\\.{3}|\u2026)[0-9a-f]*${address.slice(-4)}`, "i");
  const byName = /\bsociety (account|address)\b|\bsmart account\b|\blight account\b/i;
  return text
    .split(/(?<=[.;:!?])\s+|\n/)
    .some(
      (sentence) =>
        /\bETH\b/.test(sentence) &&
        (byName.test(sentence) || sentence.toLowerCase().includes(address) || shortened.test(sentence)),
    );
}

/**
 * Nothing the pages showed during the test, not even for a moment, put
 * ETH and the persona's Society account in one sentence: the user was
 * never asked to send ETH to the Light Account, which never needs any.
 * `saw` names a text that the flow is known to have shown (a toast, a
 * notice): it proves that the recorder was running while it mattered.
 */
export async function expectNeverAskedToFundSocietyAccount(
  seenText: SeenText,
  persona: Persona,
  options: { saw: string | RegExp },
) {
  const texts = await seenText.all();
  const saw = options.saw;
  expect(
    texts.some((text) => (typeof saw === "string" ? text.includes(saw) : saw.test(text))),
    `the recorder saw "${String(saw)}"`,
  ).toBe(true);
  expect(
    texts.filter((text) => mentionsEthWithSocietyAccount(text, persona.address)),
    "texts that put ETH and the Society account together",
  ).toEqual([]);
}

type Asked = { from?: Address; to?: Address; data?: Hex; value?: Hex };

/** The transaction of a request in the wallet's log, as the app handed it over. */
export function asked(request: { params?: unknown }): Asked {
  return (request.params as [Asked])[0];
}

/**
 * The write took two transactions of the owner wallet itself: first
 * approve(spender, amount) on `token`, then the call `data` on `to`. This
 * is the "owner" route (expectOwnerSentDirectly above)
 * for an action that spends an ERC-20 token: the auction and the VIP
 * manager are not Outpost contracts, so the Light Account plays no part.
 * Checks that
 *   - the wallet was asked for exactly two transactions, both approved, and
 *     for no signature and no EIP-5792 batch;
 *   - both went from the owner wallet straight to their contract, with
 *     exactly the expected call data and no ETH;
 *   - the owner wallet paid exactly the two fees, and the Light Account
 *     holds no ETH.
 * Clear the wallet's log before the action. Returns both receipts.
 */
export async function expectOwnerApprovedThenSent(
  { wallet, chain }: { wallet: TestWallet; chain: Chain },
  input: {
    persona: Persona;
    token: Address;
    spender: Address;
    amount: bigint;
    to: Address;
    data: Hex;
    ownerBalanceBefore: bigint;
  },
): Promise<{ approval: TransactionReceipt; action: TransactionReceipt }> {
  const { persona } = input;
  const sends = wallet.sendTransactionRequests();
  expect(
    sends.map((request) => request.outcome),
    "two transactions, approved",
  ).toEqual(["ok", "ok"]);
  expect(wallet.signatureRequests(), "no signature request").toHaveLength(0);
  expect(wallet.sendCallsRequests(), "no wallet_sendCalls").toHaveLength(0);

  const expected = [
    { to: input.token, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [input.spender, input.amount] }), what: "the approval" },
    { to: input.to, data: input.data, what: "the action" },
  ];
  const receipts: TransactionReceipt[] = [];
  let fees = BigInt(0);
  for (let index = 0; index < expected.length; index += 1) {
    const { to, data, what } = expected[index];
    const transaction = asked(sends[index]);
    expect(isAddressEqual(transaction.from!, persona.ownerAddress), `${what} sent from ${transaction.from}`).toBe(true);
    expect(isAddressEqual(transaction.to!, to), `${what} sent to ${transaction.to}`).toBe(true);
    expect(transaction.data?.toLowerCase(), `call data of ${what}`).toBe(data.toLowerCase());
    expect(BigInt(transaction.value ?? "0x0"), `${what} carries no ETH`).toBe(BigInt(0));
    const receipt = await chain.receipt(sends[index].hash!);
    expect(isAddressEqual(receipt.from, persona.ownerAddress)).toBe(true);
    expect(isAddressEqual(receipt.to!, to)).toBe(true);
    fees += receipt.gasUsed * receipt.effectiveGasPrice;
    receipts.push(receipt);
  }

  expect(input.ownerBalanceBefore - (await chain.balance(persona.ownerAddress)), "the owner wallet paid the fees").toBe(
    fees,
  );
  expect(await chain.balance(persona.address), "the Light Account holds no ETH").toBe(BigInt(0));
  return { approval: receipts[0], action: receipts[1] };
}
