import { describe, it, expect } from "vitest";
import { generateReferralCode, parseReferralCode } from "../referralCode";
import { Hex } from "viem";

describe("referralCode utils", () => {
  const inviter = "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa" as Hex;
  const signature = ("0x" + "22".repeat(65)) as Hex; // 65-byte-like signature
  const nonce = BigInt(12345);
  const expiry = BigInt(9999999999);

  it("generateReferralCode and parseReferralCode roundtrip", () => {
    const code = generateReferralCode(signature, inviter, nonce, expiry);
    const parsed = parseReferralCode(code);

    expect(parsed.inviter).toBe(inviter.toLowerCase());
    expect(parsed.nonce).toBe(nonce);
    expect(parsed.expiry).toBe(expiry);
    expect(parsed.signature).toBe(signature.toLowerCase());
  });

  it("parseReferralCode handles uppercase input", () => {
    const codeUpper = generateReferralCode(
      signature.toUpperCase() as Hex,
      inviter.toUpperCase() as Hex,
      nonce,
      expiry,
    );
    const parsed = parseReferralCode(codeUpper);

    expect(parsed.inviter).toBe(inviter.toLowerCase());
    expect(parsed.nonce).toBe(nonce);
    expect(parsed.expiry).toBe(expiry);
    expect(parsed.signature).toBe(signature.toLowerCase());
  });
});
