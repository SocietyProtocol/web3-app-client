"use client";

import { useEstimateGas as useWagmiEstimateGas, useGasPrice } from "wagmi";
import { Hex, encodeFunctionData, etherUnits } from "viem";
import { useMemo } from "react";
import { useEthPrice } from "./useEthPrice";

interface UseEstimateGasParams {
  address?: Hex;
  abi?: readonly unknown[];
  functionName?: string;
  args?: unknown[];
  value?: bigint;
  enabled?: boolean;
}

export const useEstimateGas = ({
  address,
  abi,
  functionName,
  args,
  value,
  enabled = true,
}: UseEstimateGasParams) => {
  const gasPrice = useGasPrice({
    query: {
      enabled: enabled && !!address,
    },
  });

  const estimation = useWagmiEstimateGas({
    to: address,
    value,
    data:
      address && abi && functionName && args && enabled
        ? encodeFunctionData({ abi, functionName, args })
        : undefined,
    query: {
      enabled: enabled && !!address && !!abi && !!functionName && !!args,
    },
  });

  const ethPrice = useEthPrice();

  const usdValue = useMemo(() => {
    if (estimation.data && gasPrice.data && ethPrice.data) {
      const totalGasCost = estimation.data * gasPrice.data;
      return (
        (totalGasCost * ethPrice.data) / BigInt(10) ** BigInt(etherUnits.wei)
      ); // Convert from wei to ether
    }
    return undefined;
  }, [estimation.data, gasPrice.data, ethPrice.data]);

  return {
    priceWei: gasPrice.data,
    priceUsd: ethPrice.data,
    decimalsWei: etherUnits.wei,
    decimalsUsd: 8,
    totalWei: estimation.data,
    totalUsd: usdValue,
    isLoading: estimation.isLoading || gasPrice.isLoading,
    isError: estimation.isError || gasPrice.isError,
    error: estimation.error || gasPrice.error,
  };
};
