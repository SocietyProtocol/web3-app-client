import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export const useMobileDrawer = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const closeDrawer = () => {
    setMobileOpen(false);
  };

  // Close mobile drawer after navigation completes
  useEffect(() => {
    queueMicrotask(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  return {
    mobileOpen,
    handleDrawerToggle,
    closeDrawer,
  };
};
