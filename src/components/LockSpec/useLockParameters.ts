import { SocietyVipManagerABI } from "@/abis/SocietyVipManager";
import { contracts } from "@/consts/contracts";
import { useChainVar } from "@/hooks/useChainVar";
import { useReadContract } from "wagmi";
import { TierId } from "./types";

export const useLockParameters = () => {
  const vipManagerAddress = useChainVar(contracts.vipManager);

  const minLockDuration = useReadContract({
    address: vipManagerAddress,
    abi: SocietyVipManagerABI,
    functionName: "MIN_LOCK_DURATION",
    query: {
      enabled: vipManagerAddress !== undefined,
      staleTime: Infinity,
    },
  });

  const bronzeAmount = useReadContract({
    address: vipManagerAddress,
    abi: SocietyVipManagerABI,
    functionName: "bronzeAmount",
    query: {
      enabled: vipManagerAddress !== undefined,
      staleTime: Infinity,
    },
  });

  const silverAmount = useReadContract({
    address: vipManagerAddress,
    abi: SocietyVipManagerABI,
    functionName: "silverAmount",
    query: {
      enabled: vipManagerAddress !== undefined,
      staleTime: Infinity,
    },
  });

  const goldAmount = useReadContract({
    address: vipManagerAddress,
    abi: SocietyVipManagerABI,
    functionName: "goldAmount",
    query: {
      enabled: vipManagerAddress !== undefined,
      staleTime: Infinity,
    },
  });

  return {
    minLockDuration,
    tierAmounts: {
      [TierId.BRONZE]: bronzeAmount,
      [TierId.SILVER]: silverAmount,
      [TierId.GOLD]: goldAmount,
    },
  };
};
