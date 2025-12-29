"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadingBar, { LoadingBarRef } from "react-top-loading-bar";

export const TopLoader = () => {
  const loadingBarRef = useRef<LoadingBarRef>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadingBarRef.current?.complete();
  }, [pathname, searchParams]);

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
          loadingBarRef.current?.continuousStart();
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  return <LoadingBar color="#ffffff" ref={loadingBarRef} waitingTime={300} />;
};
