import { getExpectedNetwork } from "@/lib/wagmi";
import { useMemo } from "react";
import { useChainId, useSwitchChain } from "wagmi";

export const useCheckWrongNetwork = () => {
  const chainId = useChainId();
  const expectedNetwork = useMemo(() => getExpectedNetwork(), []);
  const isWrongNetwork = useMemo(
    () => chainId !== expectedNetwork.id,
    [chainId, expectedNetwork.id]
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
