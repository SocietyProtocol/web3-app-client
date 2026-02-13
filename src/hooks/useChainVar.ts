"use client";

import { expectedNetwork } from "@/lib/wagmi";
import { useMemo } from "react";

export const useChainVar = <T>(getter: (chainId: number) => T): T =>
  useMemo(() => getter(expectedNetwork.id), [getter]);
