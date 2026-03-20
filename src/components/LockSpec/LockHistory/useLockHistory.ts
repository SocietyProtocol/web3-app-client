"use client";

import { useQuery } from "@tanstack/react-query";
import { Address } from "viem";
import { fetchLockTransactions } from "@/data/locks/utils";

export const useLockHistory = (address?: Address) =>
  useQuery({
    queryKey: ["lockHistory", address?.toLowerCase()],
    queryFn: () => fetchLockTransactions(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
