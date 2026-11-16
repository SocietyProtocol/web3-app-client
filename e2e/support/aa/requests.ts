import { toHex, type Address, type Hex } from "viem";
import {
  LIGHT_ACCOUNT_FACTORY,
  encodeCreateAccount,
  encodeCreateProfile,
  encodeExecute,
} from "../../../src/lib/smart-account";
import { BADGES_ADDRESS, CHAIN_ID, ENTRY_POINT_ADDRESS, IPFS_GATEWAY } from "../../env/hermetic";

/**
 * Requests to /api/aa/rpc built by hand, the way viem sends them, for
 * tests that speak to the proxy without the app (the `api` fixture).
 */
export const AA_RPC_PATH = `/api/aa/rpc?chainId=${CHAIN_ID}`;

export type JsonRpcReply = {
  jsonrpc?: string;
  id?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
};

/**
 * A user operation before its gas is estimated and before it is signed,
 * as the app sends it with pm_getPaymasterStubData. With `owner` it is the
 * first operation of an account that is not deployed yet (it carries the
 * Light Account factory); without, the sender must exist on chain.
 */
export function unsignedUserOperation(input: { sender: Address; callData: Hex; owner?: Address; nonce?: Hex }) {
  return {
    sender: input.sender,
    nonce: input.nonce ?? "0x0",
    ...(input.owner ? { factory: LIGHT_ACCOUNT_FACTORY, factoryData: encodeCreateAccount(input.owner) } : {}),
    callData: input.callData,
    callGasLimit: "0x0",
    verificationGasLimit: "0x0",
    preVerificationGas: "0x0",
    maxFeePerGas: toHex(BigInt(2_000_000_000)),
    maxPriorityFeePerGas: toHex(BigInt(1_000_000_000)),
    signature: "0x",
  };
}

/** The JSON-RPC body of a pm_getPaymasterStubData call: the first request for sponsorship of a send. */
export function paymasterStubCall(userOperation: ReturnType<typeof unsignedUserOperation>, id = 1) {
  return {
    jsonrpc: "2.0",
    id,
    method: "pm_getPaymasterStubData",
    params: [userOperation, ENTRY_POINT_ADDRESS, toHex(CHAIN_ID), {}],
  };
}

/**
 * The JSON-RPC body of a pm_getPaymasterData call: the second request of a
 * sponsored send, the one the paymaster signs. The proxy counts the daily
 * and app-wide limits of sponsored profile creation on this call only.
 */
export function paymasterDataCall(userOperation: ReturnType<typeof unsignedUserOperation>, id = 1) {
  return { ...paymasterStubCall(userOperation, id), method: "pm_getPaymasterData" };
}

/** A metadata URI on the IPFS gateway; the proxy does not read it. */
const A_PINNED_URI = `${IPFS_GATEWAY}/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku`;

/**
 * The first user operation of a new account that creates its profile, as
 * the app sends it for sponsorship: the Light Account factory and
 * createProfile through execute. `sender` is the owner's Society address
 * (`chain.societyAddress(owner)`).
 */
export function newAccountProfileOperation(owner: Address, sender: Address) {
  return unsignedUserOperation({
    owner,
    sender,
    callData: encodeExecute({ to: BADGES_ADDRESS, value: BigInt(0), data: encodeCreateProfile(A_PINNED_URI) }),
  });
}

/** Headers that make the proxy see the request as coming from this client IP. */
export function fromIp(ip: string) {
  return { "cf-connecting-ip": ip, "x-forwarded-for": ip };
}
