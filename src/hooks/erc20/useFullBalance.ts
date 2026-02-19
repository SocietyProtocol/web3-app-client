import { formatUnits, Hex } from "viem";
import { useBalanceOf } from "./useBalanceOf";
import { useDecimals } from "./useDecimals";
import { useSymbol } from "./useSymbol";

interface UseFullBalanceOfParams {
  address?: Hex;
  tokenAddress?: Hex;
}

export const useFullBalanceOf = ({
  address,
  tokenAddress,
}: UseFullBalanceOfParams) => {
  const rawBalance = useBalanceOf({ address, tokenAddress });

  const decimals = useDecimals(tokenAddress);

  const symbol = useSymbol(tokenAddress);

  return {
    rawBalance,
    decimals,
    symbol,
    balance:
      rawBalance.data !== undefined && decimals.data !== undefined
        ? formatUnits(rawBalance.data, decimals.data)
        : undefined,
    isLoading: rawBalance.isLoading || decimals.isLoading || symbol.isLoading,
  };
};
