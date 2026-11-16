import { toHex, type Address, type Hex } from "viem";
import { LIGHT_ACCOUNT_FACTORY, encodeCreateAccount } from "../../../src/lib/smart-account";
import { CHAIN_ID, ENTRY_POINT_ADDRESS } from "../../env/hermetic";

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
