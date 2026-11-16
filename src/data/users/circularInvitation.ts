import { Address, getAddress, isAddress } from "viem";
import { lightAccountAddress } from "@/lib/smart-account";

/**
 * The `hasInvited[inviter][invitee]` pairs that mean I already invited the
 * person whose referral code I am about to accept.
 *
 * Codes are signed by the wallet (acceptInvite recovers the inviter with
 * ECDSA) and accepted by the Outpost identity (the Light Account of an EOA),
 * so an invitation I made is recorded as hasInvited[my wallet][their Light
 * Account]. The code only names the other person's wallet, so their Light
 * Account is derived from it. Also checked: hasInvited[my wallet][their
 * wallet], for invitations accepted before Light Accounts, and the pair the
 * contract's own CircularInvitation check reads, hasInvited[my address][the
 * code's inviter].
 */
export const circularInvitationPairs = (input: {
  wallet?: string;
  address?: string;
  codeInviter?: string;
}): [inviter: Address, invitee: Address][] => {
  const valid = (value?: string): value is string =>
    !!value && isAddress(value, { strict: false });
  if (!valid(input.codeInviter)) return [];

  const codeInviter = getAddress(input.codeInviter.toLowerCase());
  const pairs: [Address, Address][] = [];
  if (valid(input.wallet)) {
    const wallet = getAddress(input.wallet.toLowerCase());
    pairs.push([wallet, lightAccountAddress(codeInviter)], [wallet, codeInviter]);
  }
  if (valid(input.address)) {
    pairs.push([getAddress(input.address.toLowerCase()), codeInviter]);
  }

  const seen = new Set<string>();
  return pairs.filter(([inviter, invitee]) => {
    const key = `${inviter}:${invitee}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
