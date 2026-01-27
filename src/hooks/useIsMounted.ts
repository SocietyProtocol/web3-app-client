import { useEffect, useReducer } from "react";

export const useIsMounted = () => {
  const [isMounted, setIsMounted] = useReducer((prev, action) => {
    return action;
  }, false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  return isMounted;
};
