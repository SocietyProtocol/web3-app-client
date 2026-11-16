import { createHash } from "node:crypto";
import { mnemonicToAccount, type HDAccount } from "viem/accounts";
import { KEY_INDEX, TEST_ONLY_MNEMONIC } from "../../env/hermetic";

/**
 * Test keys. Every key comes from the committed TEST-ONLY mnemonic at
 * m/44'/60'/0'/0/<index>. The mnemonic is public: these keys are only for
 * the local Anvil fork and must never hold anything on a real network.
 */
export function testAccount(index: number): HDAccount {
  if (!Number.isInteger(index) || index < 0 || index >= 2 ** 31) {
    throw new Error(`Test key index out of range: ${index}`);
  }
  return mnemonicToAccount(TEST_ONLY_MNEMONIC, { addressIndex: index });
}

/**
 * A key index that is unique to one persona of one attempt of one test in
 * one run. The chain is not reset between tests, so no two tests may share
 * an account. `runSalt` changes every run (E2E_RUN_SALT pins it to
 * reproduce a run against a fresh stack).
 */
export function personaKeyIndex(input: {
  runSalt: string;
  testId: string;
  retry: number;
  sequence: number;
}): number {
  const digest = createHash("sha256")
    .update(`${input.runSalt}|${input.testId}|${input.retry}|${input.sequence}`)
    .digest();
  const span = 2 ** 31 - KEY_INDEX.personaStart;
  return KEY_INDEX.personaStart + (digest.readUInt32BE(0) % span);
}

/** A stable private-range IPv4 address for a test, for the per-IP rate limits. */
export function testIpAddress(input: { runSalt: string; testId: string; retry: number }): string {
  const digest = createHash("sha256")
    .update(`${input.runSalt}|${input.testId}|${input.retry}|ip`)
    .digest();
  return `10.${digest[0]}.${digest[1]}.${1 + (digest[2] % 254)}`;
}
