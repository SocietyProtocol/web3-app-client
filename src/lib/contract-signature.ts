import { getAddress, hashMessage, type Hex } from "viem";

type SignedMessage = {
  address: string;
  message: string;
  signature: Hex;
};

export const EIP1271_MAGIC = "0x1626ba7e";

export const isValidSignatureAbi = [
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

type SignatureClient = {
  getCode: (args: { address: `0x${string}` }) => Promise<Hex | undefined>;
  readContract: (args: {
    address: `0x${string}`;
    abi: typeof isValidSignatureAbi;
    functionName: "isValidSignature";
    args: [Hex, Hex];
  }) => Promise<Hex>;
};

/**
 * Contract accounts prove a signature with EIP-1271.
 * One code read, then one signature read. No owner list.
 * An EOA stops after the code read.
 */
export async function isContractWalletSignature(
  payload: SignedMessage,
  client: SignatureClient,
) {
  const address = getAddress(payload.address);
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
