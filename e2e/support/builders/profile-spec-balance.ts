import { erc20Abi, parseUnits, type Address } from "viem";
import { tokens } from "../../../src/consts/tokens";
import type { Chain } from "../chain/chain";

/**
 * SPEC balances for the profile tests.
 *
 * A profile's "Total Balance" is the SPEC balance of a wallet, read from
 * the chain by the page. Nothing in the suite hands out SPEC, and the
 * token's minter on the fork is not known here, so a balance is written
 * straight into the token's storage on the local fork
 * (Chain.setErc20Balance). Only for the local fork.
 */
export const SPEC_TOKEN: Address = tokens.spec.sepolia;

/** The holder's SPEC balance on the local chain, in the token's smallest unit. */
export function specBalance(chain: Chain, holder: Address): Promise<bigint> {
  return chain.erc20Balance(SPEC_TOKEN, holder);
}

/** The token's symbol and decimals, as the page reads them. */
export async function specToken(chain: Chain): Promise<{ symbol: string; decimals: number }> {
  const [symbol, decimals] = await Promise.all([
    chain.public.readContract({ address: SPEC_TOKEN, abi: erc20Abi, functionName: "symbol" }),
    chain.public.readContract({ address: SPEC_TOKEN, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return { symbol, decimals };
}

/**
 * Makes `holder` hold exactly `wholeTokens` SPEC on the local fork and
 * returns the balance in the smallest unit (see Chain.setErc20Balance).
 */
export async function setSpecBalance(chain: Chain, holder: Address, wholeTokens: number): Promise<bigint> {
  const { decimals } = await specToken(chain);
  const amount = parseUnits(String(wholeTokens), decimals);
  await chain.setErc20Balance(SPEC_TOKEN, holder, amount);
  return amount;
}
