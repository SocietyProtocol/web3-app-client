"use client";

import { Box } from "@mui/material";
import { Header } from "@/components/Header/Header";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { ReactNode } from "react";
import { MainContentArea } from "./MainContentArea";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { useSidebar as useSidebar } from "@/hooks/useSidebar";
import { getQueryClient } from "@/lib/tanstack-query";
import { fetchAuction } from "@/data/auction/utils";

interface LayoutContentProps {
  children: ReactNode;
}

const auctionId = process.env.NEXT_PUBLIC_AUCTION_ID
  ? parseInt(process.env.NEXT_PUBLIC_AUCTION_ID)
  : undefined;

export const LayoutContent = ({ children }: LayoutContentProps) => {
  const { headerRef, headerHeight } = useHeaderHeight();
  const { isOpen: sidebarIsOpen, toggle: toggleSidebar } = useSidebar();

  if (auctionId !== undefined) {
    const queryClient = getQueryClient();

    try {
      queryClient.prefetchQuery({
        queryKey: ["auction", auctionId],
        queryFn: () =>
          auctionId !== undefined ? fetchAuction(auctionId) : null,
      });
    } catch (error) {
      console.error("Error prefetching auction:", error);
    }
  }

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
        <Header onMenuClick={toggleSidebar} />
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
          isOpen={sidebarIsOpen}
          onToggle={toggleSidebar}
        />
        <MainContentArea>{children}</MainContentArea>
      </Box>
    </Box>
  );
};
