"use client";

import { ChainVariable } from "@/consts/types";
import { expectedNetwork } from "@/lib/wagmi";
import { pickChainVar } from "@/utils/chainVar";
import { useMemo } from "react";

export const useChainVar = <T>(variable: ChainVariable<T>): T =>
  useMemo(() => pickChainVar(variable, expectedNetwork.id), [variable]);
