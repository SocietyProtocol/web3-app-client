import { Box, IconButton, List } from "@mui/material";
import KeyboardTabIcon from "@mui/icons-material/KeyboardTab";
import { navigationItems } from "./navigationItems";
import { NavigationItem } from "./NavigationItem";

interface SidebarContentProps {
  isExpanded: boolean;
  onToggle?: () => void;
}

export const SidebarContent = ({
  isExpanded,
  onToggle,
}: SidebarContentProps) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <List sx={{ flexGrow: 0 }}>
        {navigationItems.map((item) => (
          <NavigationItem key={item.text} item={item} isExpanded={isExpanded} />
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {onToggle && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            p: 1,
            flexShrink: 0,
          }}
        >
          <IconButton onClick={onToggle}>
            <KeyboardTabIcon
              sx={{
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: (theme) =>
                  theme.transitions.create("transform", {
                    duration: theme.transitions.duration.shorter,
                  }),
              }}
            />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};
