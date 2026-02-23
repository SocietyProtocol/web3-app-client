import { expectedNetwork } from "@/lib/wagmi";
import { erc20Abi, Hex } from "viem";
import { useReadContract } from "wagmi";

export const useSymbol = (tokenAddress: Hex | undefined) =>
  useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: !!tokenAddress, staleTime: Infinity },
    chainId: expectedNetwork.id,
  });
