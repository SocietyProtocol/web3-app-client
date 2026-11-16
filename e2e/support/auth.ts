import type { LocalAccount } from "viem";

/**
 * The x-auth-payload header that /api/profile and /api/upload-metadata
 * expect: a timestamped message signed by the wallet (src/lib/auth.ts and
 * src/hooks/useAuth.ts). The message text is repeated here because
 * src/lib/auth.ts cannot be imported outside the app (it needs the app's
 * environment). If the app changes the text, the API tests fail with
 * "Message format mismatch", which is the signal to update this.
 */
export function authMessage(address: string, timestamp: number): string {
  return `Sign this message to authenticate with Society Protocol.\n\nAddress: ${address}\nTimestamp: ${timestamp}`;
}

export async function authPayloadHeader(
  account: LocalAccount,
  overrides: { address?: string; timestamp?: number } = {},
): Promise<Record<string, string>> {
  const address = overrides.address ?? account.address;
  const timestamp = overrides.timestamp ?? Date.now();
  const message = authMessage(address, timestamp);
  const signature = await account.signMessage({ message });
  return { "x-auth-payload": JSON.stringify({ address, message, signature, timestamp }) };
}
