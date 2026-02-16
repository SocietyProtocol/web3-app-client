import { expectedNetwork } from "@/lib/wagmi";
import { useMemo } from "react";
import { useChainId, useSwitchChain } from "wagmi";

export const useCheckWrongNetwork = () => {
  const chainId = useChainId();
  const isWrongNetwork = useMemo(
    () => chainId !== expectedNetwork.id,
    [chainId],
  );
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  return {
    chainId,
    isWrongNetwork,
    switchChain,
    isSwitching,
    expectedNetwork,
  };
};
