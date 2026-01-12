import { useEffect, useRef } from "react";

export function usePrevious<T>(state: T): T | null {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    ref.current = state;
  });

  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}
