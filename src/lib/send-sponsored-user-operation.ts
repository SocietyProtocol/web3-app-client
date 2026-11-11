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
import { toAccount } from "viem/accounts";
import { getPublicClient } from "wagmi/actions";
import { aaRpcUrl } from "@/lib/pimlico-proxy";
import {
  SponsorshipUnavailableError,
  isAlreadyDeployedError,
  sponsorshipIsUnavailable,
} from "@/lib/aa/errors";
import { ownerWalletClient } from "@/lib/owner-wallet";
import {
  SPONSORSHIP_POLICY_ID,
  isSponsoredBadgesCall,
  supportedAaChainId,
} from "@/lib/smart-account";
import { wagmiConfig } from "@/lib/wagmi";

/**
 * Society pays: the owner signs in the wallet, the UserOp sender is the
 * Light Account and the paymaster covers the gas. The browser talks to
 * /api/aa/rpc, which holds the Pimlico key.
 * Throws SponsorshipUnavailableError when the paymaster, the bundler or the
 * proxy refused or failed before the owner was asked to sign; the caller
 * then sends the call paid by the owner wallet (lib/owner-pays). There is no
 * UserOp paid from the Light Account's own ETH.
 */
export async function sendSponsoredUserOperation(params: {
  chainId: number;
  to: Address;
  abi: readonly unknown[] | Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
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
  if (!isSponsoredBadgesCall({ chainId: params.chainId, to: params.to, data })) {
    throw new Error("This call is not sponsored");
  }

  const chain = params.chainId === mainnet.id ? mainnet : sepolia;
  const publicClient = getPublicClient(wagmiConfig, { chainId: params.chainId });
  const walletClient = await ownerWalletClient(params.chainId);
  if (!publicClient || !walletClient) {
    throw new Error("Wallet is not connected");
  }

  // A lagging RPC node can still report a just-deployed Light Account as
  // undeployed, so the op carries a factory and the bundler rejects it with
  // AA10 during estimation, before the owner signs. Rebuild and retry.
  const stage = { signatureRequested: false };
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await buildAndSend({ ...params, data, chain, publicClient, walletClient, stage });
    } catch (error) {
      if (attempt < AA10_ATTEMPTS && isAlreadyDeployedError(error)) {
        await new Promise((resolve) => setTimeout(resolve, AA10_RETRY_MS));
        continue;
      }
      if (sponsorshipIsUnavailable(error, stage)) throw new SponsorshipUnavailableError(error);
      throw error;
    }
  }
}

const AA10_ATTEMPTS = 3;
const AA10_RETRY_MS = 3_000;

async function buildAndSend(params: {
  chainId: number;
  to: Address;
  data: Hex;
  chain: typeof mainnet | typeof sepolia;
  publicClient: NonNullable<ReturnType<typeof getPublicClient>>;
  walletClient: NonNullable<Awaited<ReturnType<typeof ownerWalletClient>>>;
  /** Set once the wallet is asked to sign the UserOp. */
  stage: { signatureRequested: boolean };
}): Promise<Hex> {
  const { chain, publicClient, walletClient, data, stage } = params;
  // Same signer permissionless builds from a wallet client, noting when it
  // is first asked to sign: sponsorship was granted by then.
  const owner = toAccount({
    address: walletClient.account.address,
    async signMessage({ message }) {
      stage.signatureRequested = true;
      return walletClient.signMessage({ message });
    },
    async signTypedData(typedData) {
      stage.signatureRequested = true;
      return walletClient.signTypedData(
        typedData as Parameters<typeof walletClient.signTypedData>[0],
      );
    },
    async signTransaction() {
      throw new Error("Smart account signer doesn't need to sign transactions");
    },
  });
  const account = await toLightSmartAccount({
    client: publicClient,
    owner,
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
    paymaster: pimlicoClient,
    paymasterContext: {
      sponsorshipPolicyId: SPONSORSHIP_POLICY_ID,
    },
    userOperation: {
      estimateFeesPerGas: async () =>
        (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });

  return smartAccountClient.sendTransaction({
    calls: [{ to: params.to, data, value: BigInt(0) }],
  });
}
