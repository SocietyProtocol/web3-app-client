import { describe, it, expect } from "vitest";
import {
  generateReferralMessage,
  generateReferralCode,
  parseReferralCode,
} from "../referralCode";
import { Hex } from "viem";

describe("referralCode utils", () => {
  const address = "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa" as Hex;
  const signature = ("0x" + "22".repeat(65)) as Hex; // 65-byte-like signature

  it("generateReferralMessage uses lowercased address", () => {
    const msg = generateReferralMessage(address);
    expect(msg).toContain(address.toLowerCase());
  });

  it("generateReferralCode and parseReferralCode roundtrip", () => {
    const code = generateReferralCode(signature, address);
    const parsed = parseReferralCode(code);

    expect(parsed.inviter).toBe(address.toLowerCase());
    expect(parsed.signature).toBe(signature.toLowerCase());
  });

  it("parseReferralCode handles uppercase input", () => {
    const codeUpper = generateReferralCode(
      signature.toUpperCase() as Hex,
      address.toUpperCase() as Hex,
    );
    const parsed = parseReferralCode(codeUpper);

    expect(parsed.inviter).toBe(address.toLowerCase());
    expect(parsed.signature).toBe(signature.toLowerCase());
  });
});
