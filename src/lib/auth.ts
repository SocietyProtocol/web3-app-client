import {
  createPublicClient,
  getAddress,
  hashMessage,
  http,
  verifyMessage,
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export interface AuthPayload {
  address: string;
  message: string;
  signature: `0x${string}`;
  timestamp: number;
}

const MESSAGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const EIP1271_MAGIC = "0x1626ba7e";

const isValidSignatureAbi = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const;

function authPublicClient() {
  const chain = env.environment === "production" ? mainnet : sepolia;
  return createPublicClient({
    chain,
    transport: http(`https://${chain.id === mainnet.id ? "eth-mainnet" : "eth-sepolia"}.g.alchemy.com/v2/${env.alchemyApiKey}`),
  });
}

/**
 * Contract accounts prove a signature with EIP-1271.
 * One read. No owner list. EOAs never reach this.
 */
export async function isContractWalletSignature(payload: AuthPayload) {
  const address = getAddress(payload.address);
  const client = authPublicClient();
  const code = await client.getCode({ address });
  if (!code || code === "0x") return false;

  try {
    const magic = await client.readContract({
      address,
      abi: isValidSignatureAbi,
      functionName: "isValidSignature",
      args: [hashMessage(payload.message), payload.signature],
    });
    return magic.toLowerCase() === EIP1271_MAGIC;
  } catch {
    return false;
  }
}

export function generateAuthMessage(
  address: string,
  timestamp: number
): string {
  return `Sign this message to authenticate with Society Protocol.\n\nAddress: ${address}\nTimestamp: ${timestamp}`;
}

/**
 * Verifies the authentication payload from the client
 * Checks signature validity and message freshness
 */
export async function verifyAuth(
  payload: AuthPayload
): Promise<{ valid: boolean; error?: string }> {
  // Check timestamp freshness
  const now = Date.now();
  const messageAge = now - payload.timestamp;

  if (messageAge > MESSAGE_EXPIRY_MS) {
    return { valid: false, error: "Message expired" };
  }

  if (messageAge < 0) {
    return { valid: false, error: "Invalid timestamp" };
  }

  const expectedMessage = generateAuthMessage(
    payload.address,
    payload.timestamp,
  );

  if (payload.message !== expectedMessage) {
    return { valid: false, error: "Message format mismatch" };
  }

  try {
    const isValid = await verifyMessage({
      address: payload.address as `0x${string}`,
      message: payload.message,
      signature: payload.signature,
    });

    if (isValid) return { valid: true };

    if (await isContractWalletSignature(payload)) {
      return { valid: true };
    }

    return { valid: false, error: "Invalid signature" };
  } catch (error) {
    console.error("Signature verification error:", error);
    return { valid: false, error: "Signature verification failed" };
  }
}

/**
 * Extracts and verifies authentication from request headers
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ authenticated: boolean; address?: string; error?: string }> {
  const authHeader = request.headers.get("x-auth-payload");

  if (!authHeader) {
    return { authenticated: false, error: "Missing authentication" };
  }

  let payload: AuthPayload;
  try {
    payload = JSON.parse(authHeader);
  } catch {
    return { authenticated: false, error: "Invalid authentication format" };
  }

  // Validate required fields
  if (
    !payload.address ||
    !payload.message ||
    !payload.signature ||
    !payload.timestamp
  ) {
    return { authenticated: false, error: "Missing authentication fields" };
  }

  const verification = await verifyAuth(payload);

  if (!verification.valid) {
    return { authenticated: false, error: verification.error };
  }

  return { authenticated: true, address: payload.address };
}
