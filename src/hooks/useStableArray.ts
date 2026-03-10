import { useMemo } from "react";

export function useStableArray<T>(value: T[]): T[] {
  const json = JSON.stringify(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => value, [json]);
}
