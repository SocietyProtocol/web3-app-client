import { randomBytes } from "node:crypto";
import {
  concatHex,
  encodeFunctionData,
  hexToBigInt,
  numberToHex,
  sliceHex,
  type Address,
  type Hex,
  type LocalAccount,
} from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { BADGES_ADDRESS } from "../../env/hermetic";
import type { SubgraphFake } from "../backends/subgraph";
import type { Chain } from "../chain/chain";
import type { Persona } from "../personas";

/**
 * Invitations (referral codes), built and accepted without the UI: for
 * seeding "X already invited Y", and for codes the UI would never hand out
 * (expired, signed for someone else).
 *
 * An invitation is an EIP-712 `Invite` message signed by the inviter's
 * WALLET key: the badges contract recovers the inviter with ECDSA, so the
 * inviter is always the owner wallet, never the Society address. The invitee
 * is whoever calls `acceptInvite`, which for a member is the Society address
 * (the Light Account).
 *
 * The code is laid out the way the app parses it (src/utils/referralCode.ts),
 * but written here independently, so that a test of the app's generator does
 * not check the app against itself:
 *   inviter (20 bytes) | nonce (32) | expiry (32) | signature (65)
 * which is 149 bytes, 300 characters with the 0x prefix.
 */

export const INVITE_TYPES = {
  Invite: [
    { name: "inviter", type: "address" },
    { name: "invitee", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

/** Characters of a referral code, with its 0x prefix. */
export const INVITE_CODE_LENGTH = 300;

const DAY_SECONDS = 24 * 60 * 60;

export type InviteParts = {
  /** The wallet that signed the invitation. */
  inviter: Address;
  nonce: bigint;
  /** Unix seconds after which the contract refuses the invitation. */
  expiry: bigint;
  signature: Hex;
};

export type Invite = InviteParts & {
  /** The address the invitation was signed for: only it can accept. */
  invitee: Address;
  /** What the inviter hands over and the invitee pastes. */
  code: Hex;
};

/** The parts of a referral code, lowercase like the app's own codes. */
export function encodeInviteCode(parts: InviteParts): Hex {
  return concatHex([
    parts.inviter.toLowerCase() as Hex,
    numberToHex(parts.nonce, { size: 32 }),
    numberToHex(parts.expiry, { size: 32 }),
    parts.signature.toLowerCase() as Hex,
  ]);
}

/** Splits a referral code into its parts. Throws when it is not 149 bytes of hex. */
export function parseInviteCode(code: string): InviteParts {
  if (!/^0x[0-9a-fA-F]+$/.test(code) || code.length !== INVITE_CODE_LENGTH) {
    throw new Error(`Not a referral code (${code.length} characters): ${code.slice(0, 24)}...`);
  }
  const hex = code as Hex;
  return {
    inviter: sliceHex(hex, 0, 20) as Address,
    nonce: hexToBigInt(sliceHex(hex, 20, 52)),
    expiry: hexToBigInt(sliceHex(hex, 52, 84)),
    signature: sliceHex(hex, 84),
  };
}

/** A random 32-byte nonce, like the app's. */
export function randomInviteNonce(): bigint {
  return BigInt(`0x${randomBytes(32).toString("hex")}`);
}

/** Unix seconds, `offsetSeconds` from now (negative: in the past). */
export function inviteExpiry(offsetSeconds = DAY_SECONDS): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + offsetSeconds);
}

/**
 * Signs an invitation for `invitee` with the inviter's wallet key, against
 * the badges contract's own EIP-712 domain (read from the chain). Nothing is
 * written. `expiry` defaults to 24 hours from now, as in the app; pass
 * `inviteExpiry(-3600)` for a code that has expired.
 */
export async function signInvite(
  chain: Chain,
  input: { inviter: LocalAccount; invitee: Address; nonce?: bigint; expiry?: bigint },
): Promise<Invite> {
  // eip712Domain returns [fields, name, version, chainId, verifyingContract, salt, extensions].
  const [, name, version, chainId, verifyingContract] = await chain.read("eip712Domain");
  const nonce = input.nonce ?? randomInviteNonce();
  const expiry = input.expiry ?? inviteExpiry();
  const inviter = input.inviter.address;
  const signature = await input.inviter.signTypedData({
    domain: { name, version, chainId: Number(chainId), verifyingContract },
    types: INVITE_TYPES,
    primaryType: "Invite",
    message: { inviter, invitee: input.invitee, nonce, expiry },
  });
  const parts = { inviter, nonce, expiry, signature };
  return { ...parts, invitee: input.invitee, code: encodeInviteCode(parts) };
}

/** The `acceptInvite` call for an invitation, to be sent by the invitee. */
export function acceptInviteCall(invite: InviteParts) {
  return {
    to: BADGES_ADDRESS,
    data: encodeFunctionData({
      abi: SocietyProtocolBadgesABI,
      functionName: "acceptInvite",
      args: [invite.inviter, invite.nonce, invite.expiry, invite.signature],
    }),
  };
}

/**
 * Seeds "the invitee accepted this invitation": `acceptInvite` from the
 * invitee's Society address, as a sponsored user operation sent straight to
 * the local paymaster (it spends none of a test's rate limit and deploys the
 * Light Account if needed). The subgraph fake has applied it on return.
 */
export async function acceptInviteOnChain(
  deps: { chain: Chain; subgraph: SubgraphFake },
  input: { invite: InviteParts; invitee: Persona },
) {
  const receipt = await deps.chain.sendSponsored(input.invitee.owner, [acceptInviteCall(input.invite)]);
  await deps.subgraph.sync();
  return receipt;
}

/**
 * Seeds "inviter invited invitee": the inviter's wallet signs an invitation
 * for the invitee's Society address and the invitee accepts it. On chain
 * that is hasInvited[inviter.ownerAddress][invitee.address]. Returns the
 * invitation.
 */
export async function seedInvitation(
  deps: { chain: Chain; subgraph: SubgraphFake },
  input: { inviter: Persona; invitee: Persona },
): Promise<Invite> {
  const invite = await signInvite(deps.chain, { inviter: input.inviter.owner, invitee: input.invitee.address });
  await acceptInviteOnChain(deps, { invite, invitee: input.invitee });
  return invite;
}
