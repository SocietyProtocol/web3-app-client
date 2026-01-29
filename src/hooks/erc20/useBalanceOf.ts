import { erc20Abi, Hex } from "viem";
import { useReadContract } from "wagmi";

interface UseBalanceOfParams {
  address?: Hex;
  tokenAddress?: Hex;
}

export const useBalanceOf = ({ address, tokenAddress }: UseBalanceOfParams) => {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && tokenAddress) },
  });
};
