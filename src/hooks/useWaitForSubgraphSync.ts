import { useEffect, useMemo, useState } from "react";
import { execute, StatusDocument } from "../../.graphclient";

interface WaitForSubgraphSyncOptions {
  interval?: number;
  timeout?: number;
  enabled?: boolean;
}

const defaultOptions: Required<WaitForSubgraphSyncOptions> = {
  interval: 1000,
  timeout: 120_000,
  enabled: true,
};

enum Status {
  Idle = "idle",
  Waiting = "waiting",
  Synced = "synced",
  Timeout = "timeout",
}

export const fetchSubgraphStatus = () => execute(StatusDocument, {});

export const useWaitForSubgraphSync = (
  targetBlock?: bigint,
  options?: WaitForSubgraphSyncOptions,
) => {
  const [internalStatus, setInternalStatus] = useState<
    Status.Waiting | Status.Synced | Status.Timeout
  >(Status.Waiting);
  const [indexedBlock, setIndexedBlock] = useState<bigint | null>(null);

  const interval = options?.interval ?? defaultOptions.interval;
  const timeout = options?.timeout ?? defaultOptions.timeout;
  const enabled = options?.enabled ?? defaultOptions.enabled;

  useEffect(() => {
    if (!enabled || !targetBlock) return;
    const controller = new AbortController();
    const { signal } = controller;

    const start = Date.now();

    async function poll() {
      setInternalStatus(Status.Waiting);

      while (!signal.aborted && enabled && targetBlock) {
        try {
          // `signal` belongs to the transport request, not GraphQL variables.
          // The generated execute API does not expose a request-signal option,
          // so keep Status' variable payload empty and stop using the result
          // after cancellation.
          const res = await fetchSubgraphStatus();
          if (signal.aborted) return;

          const currentIndexedBlock = BigInt(res.data._meta.block.number);
          setIndexedBlock(currentIndexedBlock);

          if (currentIndexedBlock >= targetBlock) {
            setInternalStatus(Status.Synced);
            return;
          }

          if (Date.now() - start > timeout) {
            setInternalStatus(Status.Timeout);
            return;
          }

          await new Promise((r) => setTimeout(r, interval));
        } catch (error) {
          console.error("Error polling subgraph status:", error);
          // Continue polling on error
          await new Promise((r) => setTimeout(r, interval));
        }
      }
    }

    poll();

    return () => controller.abort();
  }, [enabled, interval, targetBlock, timeout]);

  const status = useMemo(
    () => (!enabled || !targetBlock ? Status.Idle : internalStatus),
    [enabled, targetBlock, internalStatus],
  );

  return useMemo(
    () => ({
      status,
      indexedBlock,
      isIdle: status === Status.Idle,
      isWaiting: status === Status.Waiting,
      isSynced: status === Status.Synced,
      isTimeout: status === Status.Timeout,
    }),
    [indexedBlock, status],
  );
};
