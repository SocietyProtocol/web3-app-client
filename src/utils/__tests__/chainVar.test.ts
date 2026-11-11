import { describe, expect, it } from "vitest";
import { mainnet, sepolia } from "viem/chains";
import { pickChainVar } from "../chainVar";
import { GOVERNOR_BADGE_ID } from "@/consts/badges";

describe("pickChainVar", () => {
  const variable = { sepolia: "s", mainnet: "m" };

  it("returns the sepolia value on Sepolia", () => {
    expect(pickChainVar(variable, sepolia.id)).toBe("s");
  });

  it("returns the mainnet value on mainnet", () => {
    expect(pickChainVar(variable, mainnet.id)).toBe("m");
  });

  it("falls back to the mainnet value for any other chain", () => {
    expect(pickChainVar(variable, 31337)).toBe("m");
  });
});

describe("GOVERNOR_BADGE_ID", () => {
  it("is badge 13 on mainnet", () => {
    expect(pickChainVar(GOVERNOR_BADGE_ID, mainnet.id)).toBe("13");
  });

  it("is the rehearsal Governor badge 69 on Sepolia", () => {
    expect(pickChainVar(GOVERNOR_BADGE_ID, sepolia.id)).toBe("69");
  });
});
