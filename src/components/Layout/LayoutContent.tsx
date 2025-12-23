"use client";

import { Box } from "@mui/material";
import { Header } from "@/components/Header/Header";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { ReactNode } from "react";
import { MainContentArea } from "./MainContentArea";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { useMobileDrawer } from "@/hooks/useMobileDrawer";

interface LayoutContentProps {
  children: ReactNode;
}

export const LayoutContent = ({ children }: LayoutContentProps) => {
  const { headerRef, headerHeight } = useHeaderHeight();
  const { mobileOpen, handleDrawerToggle } = useMobileDrawer();

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box ref={headerRef} sx={{ flexShrink: 0 }}>
        <Header onMenuClick={handleDrawerToggle} />
      </Box>

      <Box
        id="layout-content"
        sx={{
          display: "flex",
          position: "relative",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Sidebar
          headerHeight={headerHeight}
          mobileOpen={mobileOpen}
          onMobileClose={handleDrawerToggle}
        />
        <MainContentArea>{children}</MainContentArea>
      </Box>
    </Box>
  );
};
