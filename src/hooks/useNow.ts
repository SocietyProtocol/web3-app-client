"use client";

import { useEffect, useState } from "react";

const defaultTime = Math.floor(Date.now() / 1000);

interface UseNowParams {
  /**
   * Optional timestamp (in seconds) or array of timestamps to update the state when reached.
   * The hook will schedule an update for each future timestamp.
   */
  updateAt?: number | number[];
}

export const useNow = (params?: UseNowParams) => {
  const [now, setNow] = useState(defaultTime);

  useEffect(() => {
    queueMicrotask(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      setNow(currentTime);
    });

    const timestamps = params?.updateAt
      ? Array.isArray(params.updateAt)
        ? params.updateAt
        : [params.updateAt]
      : [];

    const currentTime = Math.floor(Date.now() / 1000);
    const timeoutIds = timestamps
      .filter((t) => t > currentTime)
      .map((t) =>
        setTimeout(
          () => setNow(Math.floor(Date.now() / 1000)),
          (t - currentTime) * 1000,
        ),
      );

    if (timeoutIds.length > 0) {
      return () => timeoutIds.forEach(clearTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params?.updateAt)]);

  return now;
};
