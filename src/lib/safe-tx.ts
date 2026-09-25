import { Hex } from "viem";

const SAFE_TX_SERVICE: Record<number, string> = {
  1: "https://api.safe.global/tx-service/mainnet/api/v1/multisig-transactions",
  11155111: "https://api.safe.global/tx-service/sep/api/v1/multisig-transactions",
};

const POLL_MS = 2000;
const WAIT_MS = 10 * 60 * 1000;

interface SafeMultisigTransaction {
  isExecuted?: boolean;
  isSuccessful?: boolean | null;
  transactionHash?: string | null;
}

/**
 * Safe WalletConnect returns an off-chain Safe hash from eth_sendTransaction.
 * Poll the Safe service until that hash is executed, then return the chain hash.
 * A 404 means the hash is already a normal transaction hash.
 */
export async function resolveExecutedTransactionHash(
  hash: Hex,
  chainId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Hex> {
  const base = SAFE_TX_SERVICE[chainId];
  if (!base) return hash;

  const deadline = Date.now() + WAIT_MS;

  while (Date.now() < deadline) {
    const response = await fetchImpl(`${base}/${hash}/`);

    if (response.status === 404) return hash;

    if (response.ok) {
      const body = (await response.json()) as SafeMultisigTransaction;
      if (body.isExecuted) {
        if (body.isSuccessful === false) {
          throw new Error("Safe transaction failed");
        }
        if (body.transactionHash) {
          return body.transactionHash as Hex;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  throw new Error("Timed out waiting for the Safe transaction to execute");
}
