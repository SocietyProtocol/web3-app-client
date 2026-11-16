import { readdirSync } from "fs";
import path from "path";
import { isAddress, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

// Every module in src/consts is scanned, so a new ChainVariable is covered
// without editing this test.
const constsDir = __dirname;
const moduleFiles = readdirSync(constsDir).filter(
  (f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts") && !/\.test\.tsx?$/.test(f),
);

type Found = { where: string; value: unknown };

const isChainVariable = (v: unknown): v is { sepolia: unknown; mainnet: unknown } =>
  typeof v === "object" && v !== null && "sepolia" in v && "mainnet" in v;

const collectMainnetValues = (value: unknown, where: string, out: Found[], seen: Set<unknown>) => {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  if (isChainVariable(value)) {
    out.push({ where, value: value.mainnet });
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    collectMainnetValues(child, `${where}.${key}`, out, seen);
  }
};

const loadMainnetValues = async (): Promise<Found[]> => {
  const out: Found[] = [];
  const seen = new Set<unknown>();
  for (const file of moduleFiles) {
    const mod = (await import(path.join(constsDir, file))) as Record<string, unknown>;
    for (const [name, exported] of Object.entries(mod)) {
      collectMainnetValues(exported, `${file}:${name}`, out, seen);
    }
  }
  return out;
};

describe("mainnet ChainVariables in src/consts", () => {
  it("finds the known ChainVariables", async () => {
    const found = await loadMainnetValues();
    const where = found.map((f) => f.where);
    expect(where).toContain("tokens.ts:tokens.spec");
    expect(where).toContain("contracts.ts:contracts.vipManager");
  });

  it("has no zero-address placeholders", async () => {
    const found = await loadMainnetValues();
    const placeholders = found
      .filter((f) => typeof f.value === "string" && isAddress(f.value, { strict: false }))
      .filter((f) => (f.value as string).toLowerCase() === zeroAddress)
      .map((f) => f.where);
    expect(placeholders).toEqual([]);
  });
});
