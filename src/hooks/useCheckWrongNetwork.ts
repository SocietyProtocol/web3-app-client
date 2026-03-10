import { expectedNetwork } from "@/lib/wagmi";
import { useMemo } from "react";
import { useAccount, useSwitchChain } from "wagmi";

export const useCheckWrongNetwork = () => {
  const { chainId } = useAccount();
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
