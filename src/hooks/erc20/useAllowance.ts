import { expectedNetwork } from "@/lib/wagmi";
import { erc20Abi, Hex } from "viem";
import { useReadContract } from "wagmi";

interface UseBalanceOfParams {
  ownerAddress?: Hex;
  spenderAddress?: Hex;
  tokenAddress?: Hex;
}

export const useAllowance = ({
  ownerAddress,
  spenderAddress,
  tokenAddress,
}: UseBalanceOfParams) => {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      ownerAddress && spenderAddress
        ? [ownerAddress, spenderAddress]
        : undefined,
    chainId: expectedNetwork.id,
    query: {
      enabled: Boolean(ownerAddress && spenderAddress && tokenAddress),
      staleTime: 5_000,
    },
  });
};
