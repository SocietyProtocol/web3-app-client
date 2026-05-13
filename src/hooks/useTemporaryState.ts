import { useCallback, useEffect, useRef, useState } from "react";

type SetTemporaryValue<T> = (
  newValue: T | ((prev: T) => T),
  duration?: number,
) => void;

export function useTemporaryState<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setTemporaryValue: SetTemporaryValue<T> = useCallback(
    (newValue: T | ((prev: T) => T), duration = Infinity) => {
      clearTimeoutRef();
      setValue(newValue);

      if (Number.isFinite(duration)) {
        timeoutRef.current = setTimeout(() => {
          setValue(initialValue);
          timeoutRef.current = null;
        }, duration);
      }
    },
    [clearTimeoutRef, initialValue],
  );

  useEffect(() => clearTimeoutRef, [clearTimeoutRef]);

  return [value, setTemporaryValue] as const;
}
