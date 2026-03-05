import { useState } from "react";

function shallowEqualArray(a: unknown[], b: unknown[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

export function useStableArray<T>(value: T[]): T[] {
  const [stable, setStable] = useState(value);

  if (!shallowEqualArray(stable, value)) {
    setStable(value);
  }

  return stable;
}
