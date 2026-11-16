import { encodeFunctionData, erc20Abi, type Address, type Hex, type TransactionReceipt } from "viem";
import type { Chain } from "../chain/chain";

/**
 * ERC-20 facts and allowances for the auction and Lock SPEC tests. A
 * balance is seeded with `chain.setErc20Balance(token, holder, amount)`.
 *
 * The auction's bidding token and SPEC sit on the owner WALLET, not on the
 * Society account (the app reads `useAccount().address` for both), so every
 * holder here is a wallet address.
 */
export type TokenInfo = { address: Address; symbol: string; decimals: number };

export async function tokenInfo(chain: Chain, token: Address): Promise<TokenInfo> {
  if (!(await chain.isContract(token))) {
    throw new Error(`No contract at ${token} on the fork: it cannot be used as an ERC-20 token`);
  }
  const [symbol, decimals] = await Promise.all([
    chain.public.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
    chain.public.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return { address: token, symbol, decimals };
}

export function tokenBalance(chain: Chain, token: Address, holder: Address): Promise<bigint> {
  return chain.erc20Balance(token, holder);
}

export function tokenAllowance(chain: Chain, token: Address, owner: Address, spender: Address): Promise<bigint> {
  return chain.public.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
}

/** approve(spender, amount) as the call data the app's approval sends. */
export function approveCall(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] });
}

/** Approves `spender` for `amount` as `owner` (impersonated), the way a wallet would have done earlier. */
export function approveAs(
  chain: Chain,
  token: Address,
  owner: Address,
  spender: Address,
  amount: bigint,
): Promise<TransactionReceipt> {
  return chain.sendAs(owner, { to: token, data: approveCall(spender, amount) });
}

/** `numerator / denominator` as a decimal string, the way the subgraph prints a BigDecimal. */
export function decimalString(numerator: bigint, denominator: bigint, places = 18): string {
  if (denominator === BigInt(0)) throw new Error("decimalString: division by zero");
  const scaled = (numerator * BigInt(10) ** BigInt(places)) / denominator;
  const whole = scaled / BigInt(10) ** BigInt(places);
  const fraction = (scaled % BigInt(10) ** BigInt(places)).toString().padStart(places, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}
