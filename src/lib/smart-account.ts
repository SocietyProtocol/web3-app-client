import {
  Address,
  Hex,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  isAddress,
  isAddressEqual,
  keccak256,
  pad,
  toBytes,
  toHex,
} from "viem";
import { contracts } from "@/consts/contracts";
import { URLS } from "@/consts/urls";

/**
 * Path C. MetaMask stays the owner. The Outpost identity is a new
 * Light Account v2 (EntryPoint 0.7) at salt 0.
 * S = LightAccountFactory.getAddress(owner, 0).
 */
export const LIGHT_ACCOUNT_FACTORY: Address =
  "0x0000000000400CdFef5E2714E63d8040b700BC24";
export const LIGHT_ACCOUNT_IMPLEMENTATION: Address =
  "0x8E8e658E22B12ada97B402fF0b044D6A325013C7";
export const ENTRY_POINT_V07: Address =
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
export const SPONSORSHIP_POLICY_ID = "sp_eager_ricochet";
export const LIGHT_ACCOUNT_SALT = BigInt(0);
/** EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1. */
export const ERC1967_IMPLEMENTATION_SLOT: Hex =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const ETHEREUM = 1;
const SEPOLIA = 11155111;

/**
 * Onboarding mints Society will pay for, besides the profile badge that
 * createProfile mints itself. Empty until a badge id is added here.
 * mint and mintToMultiple are refused while this list is empty.
 */
export const SPONSORED_MINT_BADGE_IDS: readonly bigint[] = [];

const MAX_BATCH_CALLS = 4;
const MAX_MINT_RECIPIENTS = 20;
export const MAX_PROFILE_URI_LENGTH = 256;

/**
 * /api/profile pins metadata and returns `${URLS.IPFS_GATEWAY}/${cid}`.
 * Sponsored profile writes may only carry that shape or ipfs://cid.
 * CIDv0 (Qm + base58btc) or CIDv1 in base32 (b + [a-z2-7]).
 */
const CID_PATTERN = "(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,200})";
const PROFILE_URI_PATTERN = new RegExp(
  `^(?:ipfs://|${URLS.IPFS_GATEWAY.replace(/\./g, "\\.")}/)${CID_PATTERN}$`,
);

export function profileMetadataUriAllowed(uri: string) {
  return uri.length <= MAX_PROFILE_URI_LENGTH && PROFILE_URI_PATTERN.test(uri);
}

const badgesAbi = [
  {
    type: "function",
    name: "createProfile",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadataURI", type: "string" }],
    outputs: [{ name: "pid", type: "uint256" }],
  },
  {
    type: "function",
    name: "updateProfileURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "newUri", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptInvite",
    stateMutability: "nonpayable",
    inputs: [
      { name: "inviter", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "mintToMultiple",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address[]" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const executeAbi = [
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "func", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "executeBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dest", type: "address[]" },
      { name: "value", type: "uint256[]" },
      { name: "func", type: "bytes[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "executeBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dest", type: "address[]" },
      { name: "func", type: "bytes[]" },
    ],
    outputs: [],
  },
] as const;

const createAccountAbi = [
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "account", type: "address" }],
  },
] as const;

export function supportedAaChainId(
  chainId: number,
): chainId is typeof ETHEREUM | typeof SEPOLIA {
  return chainId === ETHEREUM || chainId === SEPOLIA;
}

export function badgesAddress(chainId: number): Address | undefined {
  if (chainId === ETHEREUM) return contracts.badges.mainnet;
  if (chainId === SEPOLIA) return contracts.badges.sepolia;
  return undefined;
}

export function relayTarget(chainId: number, to: Address): boolean {
  const badges = badgesAddress(chainId);
  const registry =
    chainId === ETHEREUM
      ? contracts.communityRegistry.mainnet
      : chainId === SEPOLIA
        ? contracts.communityRegistry.sepolia
        : undefined;
  if (!registry && !badges) return false;
  return [badges, registry].some(
    (allowed) => allowed && sameAddress(to, allowed),
  );
}

/**
 * Init code of Solady LibClone's minimal ERC-1967 proxy, as vendored by
 * Light Account v2.0.0. Hash is keccak256 of the 95 bytes CREATE2 uses.
 */
export function lightAccountInitCode(implementation: Address = LIGHT_ACCOUNT_IMPLEMENTATION): Hex {
  const mem = new Uint8Array(0x80);
  const writeWord = (offset: number, word: Hex) => {
    mem.set(toBytes(pad(word, { size: 32 })), offset);
  };
  writeWord(
    0x60,
    "0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3",
  );
  writeWord(
    0x40,
    "0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076",
  );
  writeWord(0x20, "0x6009");
  mem.set(toBytes(pad(implementation, { size: 32 })), 0x1e);
  writeWord(0x0a, "0x603d3d8160223d3973");
  return toHex(mem.slice(0x21, 0x21 + 0x5f));
}

/**
 * Runtime code the factory leaves at S: the init code minus its 34-byte
 * constructor prefix. It does not embed the implementation, so the
 * implementation slot must be read separately.
 */
export const LIGHT_ACCOUNT_PROXY_RUNTIME_CODE: Hex = `0x${lightAccountInitCode().slice(2 + 34 * 2)}`;

export function lightAccountAddress(
  owner: Address,
  salt: bigint = LIGHT_ACCOUNT_SALT,
): Address {
  const combinedSalt = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [getAddress(owner), salt],
    ),
  );
  return getContractAddress({
    opcode: "CREATE2",
    from: LIGHT_ACCOUNT_FACTORY,
    salt: combinedSalt,
    bytecode: lightAccountInitCode(),
  });
}

type InnerCall = { to: Address; value: bigint; data: Hex };

function sameAddress(left: Address, right: Address) {
  return isAddressEqual(getAddress(left), getAddress(right));
}

function mintIdAllowed(id: bigint, mintBadgeIds: readonly bigint[]) {
  return mintBadgeIds.some((allowed) => allowed === id);
}

function innerCallIsSponsored(
  call: InnerCall,
  chainId: number,
  mintBadgeIds: readonly bigint[],
) {
  const badges = badgesAddress(chainId);
  if (!badges || !sameAddress(call.to, badges) || call.value !== BigInt(0)) {
    return false;
  }
  if (!call.data || call.data === "0x") return false;

  try {
    const decoded = decodeFunctionData({ abi: badgesAbi, data: call.data });
    if (decoded.functionName === "createProfile") {
      return profileMetadataUriAllowed(decoded.args[0]);
    }
    if (decoded.functionName === "updateProfileURI") {
      return profileMetadataUriAllowed(decoded.args[1]);
    }
    if (decoded.functionName === "acceptInvite") return true;
    if (decoded.functionName === "mint") {
      const [, id, amount] = decoded.args;
      return amount === BigInt(1) && mintIdAllowed(id, mintBadgeIds);
    }
    if (decoded.functionName === "mintToMultiple") {
      const [recipients, id, amount] = decoded.args;
      return (
        amount === BigInt(1) &&
        recipients.length > 0 &&
        recipients.length <= MAX_MINT_RECIPIENTS &&
        mintIdAllowed(id, mintBadgeIds)
      );
    }
    return false;
  } catch {
    return false;
  }
}

const executeSingleAbi = [executeAbi[0]] as const;
const executeBatchWithValueAbi = [executeAbi[1]] as const;
const executeBatchAbi = [executeAbi[2]] as const;

function asCalls(
  dest: readonly Address[],
  values: readonly bigint[],
  funcs: readonly Hex[],
): InnerCall[] | undefined {
  if (dest.length !== values.length || dest.length !== funcs.length) return undefined;
  if (dest.length === 0 || dest.length > MAX_BATCH_CALLS) return undefined;
  return dest.map((to, index) => ({
    to,
    value: values[index] ?? BigInt(0),
    data: funcs[index] ?? "0x",
  }));
}

export function accountCallsFromCallData(callData: Hex): InnerCall[] | undefined {
  try {
    const decoded = decodeFunctionData({ abi: executeSingleAbi, data: callData });
    const [to, value, data] = decoded.args;
    return [{ to, value, data }];
  } catch {
    // try the batch forms below
  }

  try {
    const decoded = decodeFunctionData({
      abi: executeBatchWithValueAbi,
      data: callData,
    });
    const [dest, values, funcs] = decoded.args;
    return asCalls(dest, values, funcs);
  } catch {
    // try the value-free batch form
  }

  try {
    const decoded = decodeFunctionData({ abi: executeBatchAbi, data: callData });
    const [dest, funcs] = decoded.args;
    return asCalls(
      dest,
      dest.map(() => BigInt(0)),
      funcs,
    );
  } catch {
    return undefined;
  }
}

export function isSponsoredBadgesCall(
  args: { chainId: number; to: Address; data: Hex },
  options?: { mintBadgeIds?: readonly bigint[] },
) {
  if (!supportedAaChainId(args.chainId)) return false;
  const badges = badgesAddress(args.chainId);
  if (!badges || !sameAddress(args.to, badges)) return false;
  const mintBadgeIds = options?.mintBadgeIds ?? SPONSORED_MINT_BADGE_IDS;
  return innerCallIsSponsored(
    { to: args.to, value: BigInt(0), data: args.data },
    args.chainId,
    mintBadgeIds,
  );
}

export type UserOperationShape = {
  sender?: string;
  callData?: string;
  factory?: string;
  factoryData?: string;
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  paymaster?: string;
  paymasterVerificationGasLimit?: string;
  paymasterPostOpGasLimit?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
};

/** Names of the badges functions a Light Account execute call reaches. */
export function badgesFunctionNames(callData: Hex, chainId: number): string[] {
  const calls = accountCallsFromCallData(callData) ?? [];
  const badges = badgesAddress(chainId);
  return calls.flatMap((call) => {
    if (!badges || !sameAddress(call.to, badges)) return [];
    try {
      return [decodeFunctionData({ abi: badgesAbi, data: call.data }).functionName];
    } catch {
      return [];
    }
  });
}

export function userOperationHasFactory(userOp: UserOperationShape) {
  const factory = userOp.factory;
  return !!factory && factory !== "0x" && factory !== "0x0";
}

/**
 * A sponsored UserOp may only execute allowlisted badges calls.
 * The first deployment must come from the Light Account factory at salt 0,
 * and the sender must be that owner's canonical address.
 */
export function userOperationIsSponsored(
  userOp: UserOperationShape,
  chainId: number,
  options?: { mintBadgeIds?: readonly bigint[] },
): { ok: true } | { ok: false; reason: string } {
  if (!supportedAaChainId(chainId)) {
    return { ok: false, reason: "Sponsorship is only enabled on Ethereum and Sepolia" };
  }
  if (!userOp.callData || !userOp.callData.startsWith("0x")) {
    return { ok: false, reason: "User operation is missing call data" };
  }

  const calls = accountCallsFromCallData(userOp.callData as Hex);
  if (!calls) {
    return { ok: false, reason: "User operation is not a Light Account execute call" };
  }

  const mintBadgeIds = options?.mintBadgeIds ?? SPONSORED_MINT_BADGE_IDS;
  const allowed = calls.every((call) =>
    innerCallIsSponsored(call, chainId, mintBadgeIds),
  );
  if (!allowed) {
    return { ok: false, reason: "User operation is outside the sponsorship allowlist" };
  }

  return canonicalFactory(userOp);
}

/**
 * The bundler may relay any badges or community-registry call from the
 * canonical Light Account. Society pays gas only for the sponsorship allowlist.
 */
export function userOperationMayRelay(
  userOp: UserOperationShape,
  chainId: number,
): { ok: true } | { ok: false; reason: string } {
  if (!supportedAaChainId(chainId)) {
    return { ok: false, reason: "Smart accounts are only enabled on Ethereum and Sepolia" };
  }
  if (!userOp.callData || !userOp.callData.startsWith("0x")) {
    return { ok: false, reason: "User operation is missing call data" };
  }
  const calls = accountCallsFromCallData(userOp.callData as Hex);
  if (!calls) {
    return { ok: false, reason: "User operation is not a Light Account execute call" };
  }
  const allowed = calls.every(
    (call) => call.value === BigInt(0) && relayTarget(chainId, call.to),
  );
  if (!allowed) {
    return { ok: false, reason: "User operation target is not an Outpost contract" };
  }
  return canonicalFactory(userOp);
}

function canonicalFactory(
  userOp: UserOperationShape,
): { ok: true } | { ok: false; reason: string } {
  const factory = userOp.factory;
  // No factory: the proxy checks the deployed sender on-chain (pimlico-proxy).
  if (!factory || !userOperationHasFactory(userOp)) return { ok: true };

  if (!isAddress(factory) || !sameAddress(factory, LIGHT_ACCOUNT_FACTORY)) {
    return { ok: false, reason: "User operation deploys an unsupported account" };
  }
  if (!userOp.factoryData || !userOp.sender || !isAddress(userOp.sender)) {
    return { ok: false, reason: "User operation deployment is incomplete" };
  }

  try {
    const decoded = decodeFunctionData({
      abi: createAccountAbi,
      data: userOp.factoryData as Hex,
    });
    const [owner, salt] = decoded.args;
    if (salt !== LIGHT_ACCOUNT_SALT) {
      return { ok: false, reason: "User operation uses a non-canonical account salt" };
    }
    const expected = lightAccountAddress(owner, salt);
    if (!sameAddress(userOp.sender, expected)) {
      return { ok: false, reason: "User operation sender does not match the owner" };
    }
  } catch {
    return { ok: false, reason: "User operation factory data is not createAccount" };
  }

  return { ok: true };
}

export function encodeCreateProfile(metadataUri: string): Hex {
  return encodeFunctionData({
    abi: badgesAbi,
    functionName: "createProfile",
    args: [metadataUri],
  });
}

export function encodeExecute(call: InnerCall): Hex {
  return encodeFunctionData({
    abi: executeAbi,
    functionName: "execute",
    args: [call.to, call.value, call.data],
  });
}
