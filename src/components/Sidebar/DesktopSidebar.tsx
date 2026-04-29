import { Drawer } from "@mui/material";
import { styled } from "@mui/material/styles";
import { SidebarContent } from "./SidebarContent";
import { COLLAPSED_WIDTH, EXPANDED_WIDTH } from "./consts";

interface DesktopSidebarProps {
  headerHeight: number;
  open: boolean;
  onToggle: () => void;
}

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) =>
    prop !== "expanded" && prop !== "headerHeight" && prop !== "open",
})<{
  headerHeight: number;
}>(({ theme, headerHeight = 68 }) => ({
  variants: [
    {
      props: ({ open }) => open,
      style: {
        width: EXPANDED_WIDTH,
        transition: theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        "& .MuiDrawer-paper": {
          width: EXPANDED_WIDTH,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      },
    },
    {
      props: ({ open }) => !open,
      style: {
        width: COLLAPSED_WIDTH,
        transition: theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        "& .MuiDrawer-paper": {
          width: COLLAPSED_WIDTH,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        },
      },
    },
  ],

  height: `calc(100vh - ${headerHeight}px)`,
  flexShrink: 0,

  "& .MuiDrawer-paper": {
    boxSizing: "border-box",
    overflowX: "hidden",
    overflowY: "auto",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(1),
    backgroundColor: "transparent",
    border: "none",
  },
}));

export const DesktopSidebar = ({
  headerHeight,
  open,
  onToggle,
}: DesktopSidebarProps) => {
  return (
    <StyledDrawer
      variant="permanent"
      anchor="left"
      open={open}
      headerHeight={headerHeight}
      sx={{ display: { xs: "none", md: "flex" } }}
    >
      <SidebarContent isExpanded={open} onToggle={onToggle} />
    </StyledDrawer>
  );
};
