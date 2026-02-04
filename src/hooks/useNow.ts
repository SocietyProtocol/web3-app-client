"use client";

import { useEffect, useState } from "react";

const defaultTime = Math.floor(Date.now() / 1000);

interface UseNowParams {
  /**
   * Optional timestamp (in seconds) to update the state when reached.
   * The hook will schedule an update when this time arrives.
   */
  updateAt?: number;
}

export const useNow = (params?: UseNowParams) => {
  const [now, setNow] = useState(defaultTime);

  useEffect(() => {
    queueMicrotask(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      setNow(currentTime);
    });

    if (params?.updateAt) {
      const currentTime = Math.floor(Date.now() / 1000);

      if (params.updateAt > currentTime) {
        // Schedule update when the target time is reached
        const delay = (params.updateAt - currentTime) * 1000;
        const timeoutId = setTimeout(() => {
          setNow(Math.floor(Date.now() / 1000));
        }, delay);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [params?.updateAt]);

  return now;
};
