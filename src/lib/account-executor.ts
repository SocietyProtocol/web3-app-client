import { Abi, encodeFunctionData, Hex } from "viem";
import { getCallsStatus, getCapabilities, sendCalls } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";
import {
  hasSendCallsCapability,
  waitForCallTransactionHash,
} from "./account-capabilities";

export async function walletSupportsSendCalls(chainId: number) {
  try {
    const capabilities = await getCapabilities(wagmiConfig, {
      chainId: chainId as 1 | 11155111,
    });
    return hasSendCallsCapability(capabilities, chainId);
  } catch {
    return false;
  }
}

export async function sendContractCall(parameters: {
  chainId: number;
  address: Hex;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}): Promise<Hex> {
  const data = encodeFunctionData({
    abi: parameters.abi as Abi,
    functionName: parameters.functionName,
    args: parameters.args,
  });

  const { id } = await sendCalls(wagmiConfig, {
    chainId: parameters.chainId as 1 | 11155111,
    calls: [
      {
        to: parameters.address,
        data,
        value: parameters.value,
      },
    ],
  });

  return waitForCallTransactionHash(() =>
    getCallsStatus(wagmiConfig, { id }),
  );
}
