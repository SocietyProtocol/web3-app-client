import { UserOperationShape } from "@/lib/smart-account";

/**
 * Ceilings for sponsored UserOps. Real Light Account v2 ops sit well below:
 * createProfile with deployment is ~350k verification and ~250k call gas.
 * Anything larger is either broken or trying to drain the policy.
 */
export const MAX_CALL_GAS_LIMIT = BigInt(750_000);
export const MAX_VERIFICATION_GAS_LIMIT = BigInt(500_000);
export const MAX_PRE_VERIFICATION_GAS = BigInt(200_000);
export const MAX_PAYMASTER_VERIFICATION_GAS_LIMIT = BigInt(150_000);
export const MAX_PAYMASTER_POST_OP_GAS_LIMIT = BigInt(100_000);

const GWEI = BigInt(1_000_000_000);

/** Mainnet fee ceilings. Sepolia fees swing far wider and cost nothing. */
export const MAX_FEE_PER_GAS: Record<number, bigint> = {
  1: BigInt(100) * GWEI,
  11155111: BigInt(2_000) * GWEI,
};
export const MAX_PRIORITY_FEE_PER_GAS: Record<number, bigint> = {
  1: BigInt(10) * GWEI,
  11155111: BigInt(200) * GWEI,
};

const HEX_QUANTITY = /^0x[0-9a-fA-F]{1,64}$/;

function quantity(value: unknown): bigint | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !HEX_QUANTITY.test(value)) return null;
  return BigInt(value);
}

/** Missing fields pass (stub calls send 0x0 or omit them). Malformed ones do not. */
export function userOperationWithinCaps(
  userOp: UserOperationShape,
  chainId: number,
): { ok: true } | { ok: false; reason: string } {
  const ceilings: [keyof UserOperationShape, bigint | undefined][] = [
    ["callGasLimit", MAX_CALL_GAS_LIMIT],
    ["verificationGasLimit", MAX_VERIFICATION_GAS_LIMIT],
    ["preVerificationGas", MAX_PRE_VERIFICATION_GAS],
    ["paymasterVerificationGasLimit", MAX_PAYMASTER_VERIFICATION_GAS_LIMIT],
    ["paymasterPostOpGasLimit", MAX_PAYMASTER_POST_OP_GAS_LIMIT],
    ["maxFeePerGas", MAX_FEE_PER_GAS[chainId]],
    ["maxPriorityFeePerGas", MAX_PRIORITY_FEE_PER_GAS[chainId]],
  ];
  for (const [field, ceiling] of ceilings) {
    const value = quantity(userOp[field]);
    if (value === null) {
      return { ok: false, reason: `User operation ${field} is not a hex quantity` };
    }
    if (ceiling === undefined) {
      return { ok: false, reason: "Sponsorship is only enabled on Ethereum and Sepolia" };
    }
    if (value !== undefined && value > ceiling) {
      return { ok: false, reason: `User operation ${field} is above the sponsorship cap` };
    }
  }
  return { ok: true };
}
