import { Box, IconButton, List, Tooltip, Typography } from "@mui/material";
import KeyboardTabIcon from "@mui/icons-material/KeyboardTab";
import { keyframes } from "@emotion/react";

const attentionPulse = keyframes`
  0%   { box-shadow: 0 0 0 0px rgba(144, 202, 249, 0.45); }
  60%  { box-shadow: 0 0 0 7px rgba(144, 202, 249, 0); }
  100% { box-shadow: 0 0 0 0px rgba(144, 202, 249, 0); }
`;
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
            flexDirection: "row",
            alignItems: "center",
            p: 1,
            flexShrink: 0,
          }}
        >
          <Tooltip
            title={!isExpanded ? "Expand sidebar" : ""}
            placement="right"
            arrow
          >
            <IconButton
              onClick={onToggle}
              aria-label={!isExpanded ? "Expand sidebar" : "Collapse sidebar"}
              size="small"
              sx={{
                flexShrink: 0,
                borderRadius: "50%",
                animation: `${attentionPulse} 1.1s ease-out 2s 3`,
              }}
            >
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
          </Tooltip>
          <Typography
            variant="caption"
            color="text.primary"
            sx={{
              userSelect: "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              opacity: isExpanded ? 0.7 : 0,
              maxWidth: isExpanded ? 120 : 0,
              ml: isExpanded ? 0.5 : 0,
              transition: (theme) =>
                theme.transitions.create(["opacity", "max-width", "margin"], {
                  duration: theme.transitions.duration.shorter,
                }),
            }}
          >
            Collapse
          </Typography>
        </Box>
      )}
    </Box>
  );
};
