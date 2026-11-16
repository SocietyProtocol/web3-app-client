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
      {/* The mobile drawer is a modal that stays mounted and is only hidden by
          CSS from md up. Left open there, it marks the rest of the page
          aria-hidden and traps focus, so it opens on mobile only. */}
      <MobileSidebar open={isOpen && isMobile} onClose={onToggle} />
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
