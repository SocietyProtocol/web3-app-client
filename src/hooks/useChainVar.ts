"use client";

import { ChainVariable } from "@/consts/types";
import { expectedNetwork } from "@/lib/wagmi";
import { useMemo } from "react";
import { sepolia } from "viem/chains";

export const useChainVar = <T>(variable: ChainVariable<T>): T =>
  useMemo(
    () =>
      expectedNetwork.id === sepolia.id ? variable.sepolia : variable.mainnet,
    [variable],
  );
