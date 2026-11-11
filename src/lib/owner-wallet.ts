import { getAccount, getWalletClient, switchChain } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";

function isChainMismatch(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "ConnectorChainMismatchError" ||
      /does not match the connection's chain/i.test(error.message))
  );
}

/** The owner's wallet on chainId, asking it to switch chains if needed. */
export async function ownerWalletClient(chainId: 1 | 11155111) {
  const connected = getAccount(wagmiConfig).chainId;
  if (connected !== undefined && connected !== chainId) {
    await switchChain(wagmiConfig, { chainId });
  }
  try {
    return await getWalletClient(wagmiConfig, { chainId });
  } catch (error) {
    if (!isChainMismatch(error)) throw error;
    await switchChain(wagmiConfig, { chainId });
    return getWalletClient(wagmiConfig, { chainId });
  }
}
