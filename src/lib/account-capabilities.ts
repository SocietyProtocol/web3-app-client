import { Hex } from "viem";

const POLL_MS = 3000;
const WAIT_MS = 8 * 60 * 1000;

type ChainCapabilities = {
  atomicBatch?: { status?: string };
  atomic?: { status?: string };
};

export function hasSendCallsCapability(
  capabilities: unknown,
  chainId: number,
): boolean {
  if (!capabilities || typeof capabilities !== "object") return false;
  const chain = (capabilities as Record<string, ChainCapabilities>)[
    String(chainId)
  ];
  const status = chain?.atomicBatch?.status ?? chain?.atomic?.status;
  return status === "supported" || status === "ready";
}

type CallStatus = {
  status?: "pending" | "success" | "failure";
  receipts?: { transactionHash?: Hex }[];
};

export async function submitAccountWrite<T>(options: {
  supportsSendCalls: boolean;
  write: () => Promise<T>;
  send: () => Promise<T>;
}): Promise<T> {
  if (options.supportsSendCalls) return options.send();
  return options.write();
}

export async function waitForCallTransactionHash(
  readStatus: () => Promise<CallStatus>,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<Hex> {
  const intervalMs = options?.intervalMs ?? POLL_MS;
  const deadline = Date.now() + (options?.timeoutMs ?? WAIT_MS);

  while (Date.now() < deadline) {
    const status = await readStatus();
    if (status.status === "failure") {
      throw new Error("Wallet call failed");
    }
    const hash = status.receipts?.[0]?.transactionHash;
    if (status.status === "success" && hash) return hash;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for the wallet call to confirm");
}
