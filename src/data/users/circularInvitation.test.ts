import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { lightAccountAddress } from "@/lib/smart-account";
import { circularInvitationPairs } from "./circularInvitation";

const myWallet = getAddress("0x00000000000000000000000000000000000000a1");
const friendWallet = getAddress("0x00000000000000000000000000000000000000b2");
const myAccount = lightAccountAddress(myWallet);
const friendAccount = lightAccountAddress(friendWallet);

describe("circularInvitationPairs", () => {
  it("asks whether my wallet invited the code inviter's Light Account, where acceptInvite records it", () => {
    const pairs = circularInvitationPairs({
      wallet: myWallet,
      address: myAccount,
      codeInviter: friendWallet,
    });

    expect(pairs).toContainEqual([myWallet, friendAccount]);
  });

  it("also covers an invitation accepted by the wallet itself and the contract's own CircularInvitation pair", () => {
    const pairs = circularInvitationPairs({
      wallet: myWallet,
      address: myAccount,
      codeInviter: friendWallet,
    });

    expect(pairs).toEqual([
      [myWallet, friendAccount],
      [myWallet, friendWallet],
      [myAccount, friendWallet],
    ]);
  });

  it("does not ask the Society address as inviter for the friend's Light Account, a pair a code never makes", () => {
    const pairs = circularInvitationPairs({
      wallet: myWallet,
      address: myAccount,
      codeInviter: friendWallet,
    });

    expect(pairs).not.toContainEqual([myAccount, friendAccount]);
  });

  it("accepts lowercase and checksum-less addresses", () => {
    const pairs = circularInvitationPairs({
      wallet: myWallet.toLowerCase(),
      address: myAccount.toLowerCase(),
      codeInviter: friendWallet.toLowerCase(),
    });

    expect(pairs[0]).toEqual([myWallet, friendAccount]);
  });

  it("drops duplicate pairs for a contract wallet, whose address is the wallet", () => {
    const pairs = circularInvitationPairs({
      wallet: myWallet,
      address: myWallet,
      codeInviter: friendWallet,
    });

    expect(pairs).toEqual([
      [myWallet, friendAccount],
      [myWallet, friendWallet],
    ]);
  });

  it("returns nothing without a valid code inviter", () => {
    expect(circularInvitationPairs({ wallet: myWallet, address: myAccount })).toEqual([]);
    expect(
      circularInvitationPairs({ wallet: myWallet, address: myAccount, codeInviter: "0x1234" }),
    ).toEqual([]);
  });

  it("only asks the address pair while the wallet is unknown", () => {
    expect(
      circularInvitationPairs({ address: myAccount, codeInviter: friendWallet }),
    ).toEqual([[myAccount, friendWallet]]);
  });
});
