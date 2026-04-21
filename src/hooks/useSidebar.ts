import { useState, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { breakpoints } from "@/theme/breakpoints";

const subscribeToViewport = (cb: () => void) => {
  const mql = window.matchMedia(`(min-width: ${breakpoints.values.md}px)`);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};

export const useSidebar = () => {
  const pathname = usePathname();

  // useSyncExternalStore is the React-idiomatic way to read browser APIs
  // without hydration errors. React uses getServerSnapshot() on the server
  // and during initial hydration (so HTML matches), then switches to
  // getSnapshot() on the client after hydration — no mismatch, no error.
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(`(min-width: ${breakpoints.values.md}px)`).matches,
    () => false,
  );

  // null = follow the viewport; true/false = user manually toggled
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  const isOpen = manualOverride ?? isDesktop;

  // Functional updater avoids stale closure on isOpen
  const toggle = () => setManualOverride((prev) => !(prev ?? isDesktop));

  // Reset override after navigation so the mobile drawer closes itself
  useEffect(() => {
    if (isDesktop) return;
    setTimeout(() => setManualOverride(null), 0);
  }, [isDesktop, pathname]);

  return { isOpen, toggle };
};
