import { createSmartAccountClient } from "permissionless";
import { toLightSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  Abi,
  Address,
  Hex,
  encodeFunctionData,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { mainnet, sepolia } from "viem/chains";
import { http } from "viem";
import {
  getAccount,
  getPublicClient,
  getWalletClient,
  switchChain,
} from "wagmi/actions";
import { aaRpcUrl } from "@/lib/pimlico-proxy";
import {
  SPONSORSHIP_POLICY_ID,
  isSponsoredBadgesCall,
  supportedAaChainId,
} from "@/lib/smart-account";
import { wagmiConfig } from "@/lib/wagmi";

function isChainMismatch(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "ConnectorChainMismatchError" ||
      /does not match the connection's chain/i.test(error.message))
  );
}

/** The owner's wallet on chainId, asking it to switch chains if needed. */
async function ownerWalletClient(chainId: 1 | 11155111) {
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

/**
 * Owner signs in MetaMask. The UserOp sender is the Light Account.
 * The browser talks to /api/aa/rpc, which holds the Pimlico key.
 */
export async function sendSponsoredUserOperation(params: {
  chainId: number;
  to: Address;
  abi: readonly unknown[] | Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  sponsor?: boolean;
}): Promise<Hex> {
  if (!supportedAaChainId(params.chainId)) {
    throw new Error("Smart accounts are only enabled on Ethereum and Sepolia");
  }
  if (params.value && params.value !== BigInt(0)) {
    throw new Error("Sponsored calls cannot transfer ETH");
  }

  const data = encodeFunctionData({
    abi: params.abi as Abi,
    functionName: params.functionName,
    args: params.args ?? [],
  });
  const sponsor = params.sponsor !== false;
  if (sponsor && !isSponsoredBadgesCall({ chainId: params.chainId, to: params.to, data })) {
    throw new Error("This call is not sponsored");
  }

  const chain = params.chainId === mainnet.id ? mainnet : sepolia;
  const publicClient = getPublicClient(wagmiConfig, { chainId: params.chainId });
  const walletClient = await ownerWalletClient(params.chainId);
  if (!publicClient || !walletClient) {
    throw new Error("Wallet is not connected");
  }

  const account = await toLightSmartAccount({
    client: publicClient,
    owner: walletClient,
    version: "2.0.0",
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const rpc = aaRpcUrl(params.chainId);
  const pimlicoClient = createPimlicoClient({
    chain,
    transport: http(rpc),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const smartAccountClient = createSmartAccountClient({
    account,
    chain,
    client: publicClient,
    bundlerTransport: http(rpc),
    ...(sponsor
      ? {
          paymaster: pimlicoClient,
          paymasterContext: {
            sponsorshipPolicyId: SPONSORSHIP_POLICY_ID,
          },
        }
      : {}),
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });

  return smartAccountClient.sendTransaction({
    calls: [{ to: params.to, data, value: BigInt(0) }],
  });
}
