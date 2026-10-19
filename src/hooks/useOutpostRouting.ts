"use client";

import { useMemo } from "react";
import { Abi, Address, Hex, encodeFunctionData } from "viem";
import { useChainId, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import {
  OutpostRoute,
  callShape,
  chooseWriteSender,
  resolveOutpostRoute,
} from "@/lib/outpost-routing";

/**
 * Which account will send this write. Only unsponsored Outpost calls need
 * the chain to decide; everything else is known right away.
 */
export function useOutpostRouting(params: {
  address?: Hex;
  abi?: readonly unknown[];
  functionName?: string;
  args?: unknown[];
  value?: bigint;
  enabled?: boolean;
}): { route?: OutpostRoute; isLoading: boolean } {
  const { address: to, abi, functionName, args, value, enabled = true } = params;
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const outpost = useOutpostAccount();
  const owner = outpost.ownerAddress;
  const smartAccount = outpost.isSmartAccount ? outpost.address : undefined;

  const data = useMemo<Hex | undefined>(() => {
    if (!to || !abi || !functionName || !args) return undefined;
    try {
      return encodeFunctionData({ abi: abi as Abi, functionName, args });
    } catch {
      return undefined;
    }
  }, [to, abi, functionName, args]);

  const immediate = useMemo(() => {
    if (!to || !data || outpost.isLoading) return undefined;
    const shape = callShape({ chainId, to, data, value });
    const needsChain =
      !!owner && !!smartAccount && shape.relayable && !shape.sponsored;
    if (needsChain) return undefined;
    return chooseWriteSender({
      owner,
      smartAccount,
      isContractWallet: outpost.isContractWallet,
      ...shape,
    });
  }, [to, data, value, chainId, owner, smartAccount, outpost.isLoading, outpost.isContractWallet]);

  const query = useQuery({
    queryKey: [
      "outpost-route",
      chainId,
      to,
      data,
      value?.toString(),
      owner,
      smartAccount,
    ],
    queryFn: () =>
      resolveOutpostRoute(publicClient, {
        chainId,
        to: to as Address,
        abi: abi as readonly unknown[],
        functionName: functionName as string,
        args,
        value,
        owner,
        smartAccount,
        isContractWallet: outpost.isContractWallet,
      }),
    enabled:
      enabled && !!publicClient && !!data && !outpost.isLoading && !immediate,
    retry: false,
  });

  if (immediate) return { route: immediate, isLoading: false };
  return {
    route: query.data,
    isLoading: enabled && (outpost.isLoading || (!!data && query.isPending)),
  };
}
