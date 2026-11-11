import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BaseError,
  Hex,
  UserRejectedRequestError,
  createPublicClient,
  custom,
  getAddress,
  pad,
} from "viem";
import { sepolia } from "viem/chains";
import { contracts } from "@/consts/contracts";
import { SponsorshipUnavailableError } from "@/lib/aa/errors";
import { lightAccountAddress } from "@/lib/smart-account";

/**
 * The Light Account here is the real permissionless one, built around the
 * signer sendSponsoredUserOperation hands it. Only the bundler client is
 * replaced, so each test decides what happens before and after the real
 * signUserOperation reaches the owner wallet.
 */
type LightAccount = {
  signUserOperation: (userOperation: Record<string, unknown>) => Promise<Hex>;
};
type SendBehaviour = (account: LightAccount) => Promise<Hex>;

const mocks = vi.hoisted(() => ({
  behaviour: undefined as unknown,
  walletSignMessage: vi.fn(),
  walletSignTypedData: vi.fn(),
  publicClient: undefined as unknown,
}));

vi.mock("@/lib/wagmi", () => ({ wagmiConfig: {} }));
vi.mock("wagmi/actions", () => ({
  getPublicClient: () => mocks.publicClient,
}));
vi.mock("@/lib/owner-wallet", () => ({
  ownerWalletClient: async () => ({
    account: { address: "0x00000000000000000000000000000000000000e0" },
    signMessage: mocks.walletSignMessage,
    signTypedData: mocks.walletSignTypedData,
  }),
}));
vi.mock("permissionless", () => ({
  createSmartAccountClient: ({ account }: { account: LightAccount }) => ({
    sendTransaction: () => (mocks.behaviour as SendBehaviour)(account),
  }),
}));

import { sendSponsoredUserOperation } from "@/lib/send-sponsored-user-operation";

const owner = getAddress("0x00000000000000000000000000000000000000e0");
const USER_OP_HASH = `0x${"c".repeat(64)}` as Hex;
const WALLET_SIGNATURE = `0x${"1".repeat(130)}` as Hex;

const createProfile = {
  chainId: sepolia.id,
  to: contracts.badges.sepolia,
  abi: [
    {
      type: "function",
      name: "createProfile",
      stateMutability: "nonpayable",
      inputs: [{ name: "metadataURI", type: "string" }],
      outputs: [],
    },
  ],
  functionName: "createProfile",
  args: ["ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy"],
};

const userOperation = {
  sender: lightAccountAddress(owner),
  nonce: BigInt(0),
  callData: "0x" as Hex,
  callGasLimit: BigInt(100_000),
  verificationGasLimit: BigInt(100_000),
  preVerificationGas: BigInt(50_000),
  maxFeePerGas: BigInt(1_000_000_000),
  maxPriorityFeePerGas: BigInt(1_000_000_000),
};

const refusal = (details: string) => new BaseError("RPC Request failed.", { details });

function behave(behaviour: SendBehaviour) {
  mocks.behaviour = behaviour;
}

beforeEach(() => {
  mocks.walletSignMessage.mockReset().mockResolvedValue(WALLET_SIGNATURE);
  mocks.walletSignTypedData.mockReset().mockResolvedValue(WALLET_SIGNATURE);
  mocks.publicClient = createPublicClient({
    chain: sepolia,
    transport: custom({
      request: async ({ method }: { method: string }) => {
        // permissionless asks the EntryPoint for the counterfactual address.
        if (method === "eth_call") return pad(lightAccountAddress(owner));
        throw new Error(`unexpected RPC call in test: ${method}`);
      },
    }),
  });
});

describe("sendSponsoredUserOperation", () => {
  it("returns the hash when sponsorship and the signature succeed", async () => {
    behave(async (account) => {
      await account.signUserOperation(userOperation);
      return USER_OP_HASH;
    });
    expect(await sendSponsoredUserOperation(createProfile)).toBe(USER_OP_HASH);
    // permissionless signs the UserOp through the owner wallet's signMessage.
    expect(mocks.walletSignMessage).toHaveBeenCalledTimes(1);
  });

  it("reports sponsorship as unavailable when the paymaster refuses before the signature", async () => {
    const cause = refusal("Daily sponsored invite limit reached");
    behave(async () => {
      throw cause;
    });
    const error = await sendSponsoredUserOperation(createProfile).catch((e) => e);
    expect(error).toBeInstanceOf(SponsorshipUnavailableError);
    expect((error as Error).cause).toBe(cause);
    expect(mocks.walletSignMessage).not.toHaveBeenCalled();
  });

  it("never reports sponsorship as unavailable once the wallet was asked to sign", async () => {
    // The UserOp may already be with the bundler: paying for a second copy
    // from the wallet would double the action.
    const afterSignature = refusal("Timed out while waiting for the user operation receipt");
    behave(async (account) => {
      await account.signUserOperation(userOperation);
      throw afterSignature;
    });
    const error = await sendSponsoredUserOperation(createProfile).catch((e) => e);
    expect(mocks.walletSignMessage).toHaveBeenCalledTimes(1);
    expect(error).toBe(afterSignature);
    expect(error).not.toBeInstanceOf(SponsorshipUnavailableError);
  });

  it("passes a rejected signature through as the user's answer", async () => {
    const rejection = new UserRejectedRequestError(new Error("User rejected the request."));
    mocks.walletSignMessage.mockRejectedValue(rejection);
    behave(async (account) => account.signUserOperation(userOperation));
    const error = await sendSponsoredUserOperation(createProfile).catch((e) => e);
    expect(error).not.toBeInstanceOf(SponsorshipUnavailableError);
    expect(error).toBe(rejection);
  });

  it("does not treat a rejection before the signature as a sponsorship refusal", async () => {
    const rejection = new UserRejectedRequestError(new Error("User rejected the request."));
    behave(async () => {
      throw rejection;
    });
    const error = await sendSponsoredUserOperation(createProfile).catch((e) => e);
    expect(error).toBe(rejection);
  });

  it("retries a lagging node's AA10 and still honours the signature stage", async () => {
    vi.useFakeTimers();
    try {
      let attempts = 0;
      behave(async (account) => {
        attempts += 1;
        if (attempts === 1) throw refusal("AA10 sender already constructed");
        await account.signUserOperation(userOperation);
        throw refusal("bundler dropped the operation");
      });
      const pending = sendSponsoredUserOperation(createProfile).catch((e) => e);
      await vi.advanceTimersByTimeAsync(10_000);
      const error = await pending;
      expect(attempts).toBe(2);
      expect(error).not.toBeInstanceOf(SponsorshipUnavailableError);
    } finally {
      vi.useRealTimers();
    }
  });
});
