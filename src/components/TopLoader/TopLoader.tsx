"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLoadingBar } from "react-top-loading-bar";

export const TopLoader = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { start, complete } = useLoadingBar();

  useEffect(() => {
    complete();
  }, [complete, pathname, searchParams]);

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
          start("continuous", 0);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname, start]);

  return null;
};
