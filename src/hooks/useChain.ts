import { useMemo } from "react";
import { useChains } from "wagmi";

export const useChain = (chainId?: number) => {
  const chains = useChains();
  const currentChain = useMemo(
    () => chains.find((c) => c.id === chainId),
    [chains, chainId],
  );

  return currentChain;
};
