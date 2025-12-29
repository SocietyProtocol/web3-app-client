"use client";

import { MobileSidebar } from "./MobileSidebar";
import { DesktopSidebar } from "./DesktopSidebar";
import { useIsMobile } from "@/hooks/useIsMobile";

interface SidebarProps {
  headerHeight: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ headerHeight, isOpen, onToggle }: SidebarProps) => {
  const isMobile = useIsMobile();

  return (
    <>
      <MobileSidebar open={isOpen} onClose={onToggle} />
      {!isMobile && (
        <DesktopSidebar
          headerHeight={headerHeight}
          open={isOpen}
          onToggle={onToggle}
        />
      )}
    </>
  );
};
