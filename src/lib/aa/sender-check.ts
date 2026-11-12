import { Address, getAddress, isAddress, isAddressEqual, isHex } from "viem";
import {
  ERC1967_IMPLEMENTATION_SLOT,
  LIGHT_ACCOUNT_IMPLEMENTATION,
  LIGHT_ACCOUNT_PROXY_RUNTIME_CODE,
  LIGHT_ACCOUNT_SALT,
  lightAccountAddress,
  supportedAaChainId,
} from "@/lib/smart-account";

const RPC_TIMEOUT_MS = 8_000;
const MAX_CACHED_SENDERS = 10_000;
/** owner() on Light Account v2. */
const OWNER_SELECTOR = "0x8da5cb5b";

const PUBLIC_RPC: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
};

const ALCHEMY_NETWORK: Record<number, string> = {
  1: "eth-mainnet",
  11155111: "eth-sepolia",
};

/**
 * Same Alchemy endpoints wagmi and lib/auth use. Falls back to a public
 * node when the key is not set (local dev, tests).
 */
export function serverRpcUrl(chainId: number) {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const network = ALCHEMY_NETWORK[chainId];
  if (key && network) return `https://${network}.g.alchemy.com/v2/${key}`;
  return PUBLIC_RPC[chainId];
}

async function rpc(chainId: number, method: string, params: unknown[]): Promise<unknown> {
  const url = serverRpcUrl(chainId);
  if (!url) throw new Error("No RPC for chain");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
      cache: "no-store",
    });
    const body = (await response.json()) as { result?: unknown; error?: unknown };
    if (body.error || body.result === undefined) throw new Error("RPC error");
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

function wordAddress(value: unknown): Address | undefined {
  if (typeof value !== "string" || !isHex(value) || value.length !== 66) return undefined;
  return getAddress(`0x${value.slice(-40)}`);
}

const verified = new Set<string>();

export function resetSenderCache() {
  verified.clear();
}

/**
 * A UserOp without a factory must come from an already deployed canonical
 * Light Account v2: the Solady ERC-1967 proxy, pointing at the v2
 * implementation, whose owner's salt-0 address is the sender itself.
 * Positive results are cached in memory for the life of the instance.
 */
export async function verifyDeployedLightAccount(
  chainId: number,
  sender: unknown,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!supportedAaChainId(chainId)) {
    return { ok: false, reason: "Unsupported chain" };
  }
  if (typeof sender !== "string" || !isAddress(sender)) {
    return { ok: false, reason: "User operation sender is not an address" };
  }
  const key = `${chainId}:${sender.toLowerCase()}`;
  if (verified.has(key)) return { ok: true };

  let code: unknown;
  let slot: unknown;
  let owner: unknown;
  try {
    [code, slot, owner] = await Promise.all([
      rpc(chainId, "eth_getCode", [sender, "latest"]),
      rpc(chainId, "eth_getStorageAt", [sender, ERC1967_IMPLEMENTATION_SLOT, "latest"]),
      rpc(chainId, "eth_call", [{ to: sender, data: OWNER_SELECTOR }, "latest"]),
    ]);
  } catch {
    return { ok: false, reason: "Could not verify the account on-chain" };
  }

  if (
    typeof code !== "string" ||
    code.toLowerCase() !== LIGHT_ACCOUNT_PROXY_RUNTIME_CODE.toLowerCase()
  ) {
    return { ok: false, reason: "User operation sender is not a Light Account" };
  }
  const implementation = wordAddress(slot);
  if (!implementation || !isAddressEqual(implementation, LIGHT_ACCOUNT_IMPLEMENTATION)) {
    return { ok: false, reason: "User operation sender uses another implementation" };
  }
  const ownerAddress = wordAddress(owner);
  if (
    !ownerAddress ||
    !isAddressEqual(lightAccountAddress(ownerAddress, LIGHT_ACCOUNT_SALT), sender)
  ) {
    return { ok: false, reason: "User operation sender does not match its owner" };
  }

  if (verified.size >= MAX_CACHED_SENDERS) verified.clear();
  verified.add(key);
  return { ok: true };
}
