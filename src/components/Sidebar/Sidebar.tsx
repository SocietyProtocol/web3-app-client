"use client";

import { useMediaQuery, useTheme } from "@mui/material";
import { MobileSidebar } from "./MobileSidebar";
import { DesktopSidebar } from "./DesktopSidebar";

interface SidebarProps {
  headerHeight: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar = ({
  headerHeight,
  mobileOpen,
  onMobileClose,
}: SidebarProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <>
      <MobileSidebar open={mobileOpen} onClose={onMobileClose} />
      {!isMobile && <DesktopSidebar headerHeight={headerHeight} />}
    </>
  );
};
