"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLoadingBar } from "react-top-loading-bar";

export const TopLoader = () => {
  const pathname = usePathname();

  const { start, complete, getProgress } = useLoadingBar();

  useEffect(() => {
    complete();
  }, [complete, pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && anchor.href && !anchor.target) {
        const url = new URL(anchor.href);

        if (
          url.pathname !== pathname &&
          url.origin === window.location.origin
        ) {
          if (getProgress() === 0) {
            start("continuous", 0);
          }
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [getProgress, pathname, start]);

  return null;
};
