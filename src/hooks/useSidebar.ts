import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useIsMobile } from "./useIsMobile";

export const useSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  // Close mobile drawer after navigation completes
  useEffect(() => {
    if (!isMobile) return;

    setTimeout(() => setIsOpen(false), 0);
  }, [isMobile, pathname]);

  return {
    isOpen,
    toggle,
  };
};
