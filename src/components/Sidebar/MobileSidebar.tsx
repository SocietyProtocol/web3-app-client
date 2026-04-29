import { Drawer } from "@mui/material";
import { SidebarContent } from "./SidebarContent";
import { EXPANDED_WIDTH } from "./consts";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export const MobileSidebar = ({ open, onClose }: MobileSidebarProps) => {
  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        display: { xs: "block", md: "none" },
        zIndex: (theme) => theme.zIndex.drawer + 2,
        "& .MuiDrawer-paper": {
          boxSizing: "border-box",
          width: EXPANDED_WIDTH,
          padding: (theme) => theme.spacing(2),
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <SidebarContent isExpanded={open} onToggle={onClose} />
    </Drawer>
  );
};
