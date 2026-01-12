import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Badge,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { NavigationItem as NavigationItemType } from "./navigationItems";
import { styled } from "@mui/material/styles";
import { mapStatusToColor } from "../Auction/AuctionStatus";

interface NavigationItemProps {
  item: NavigationItemType;
  isExpanded: boolean;
}

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderRadius: "10px",
  border: "1px solid transparent",
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",

  "&.Mui-selected": {
    background: "transparent",

    "::after": {
      content: '""',
      position: "absolute",
      inset: 1, // ⬅️ matches border thickness
      borderRadius: 9, // ⬅️ radius - border
      background: theme.palette.action.selected,
      zIndex: -1,
      pointerEvents: "none",
    },

    ...theme.mixins.borderGradient("10px"),

    "&:hover": {
      backgroundColor: "transparent",

      "::after": {
        content: '""',
        position: "absolute",
        inset: 1, // ⬅️ matches border thickness
        borderRadius: 9, // ⬅️ radius - border
        background: theme.palette.action.hover,
        zIndex: -1,
        pointerEvents: "none",
      },
    },
  },

  "&:hover": {
    backgroundColor: "transparent",

    "::after": {
      content: '""',
      position: "absolute",
      inset: 1, // ⬅️ matches border thickness
      borderRadius: 9, // ⬅️ radius - border
      background: theme.palette.action.hover,
      zIndex: -1,
      pointerEvents: "none",
    },
  },
}));

export const NavigationItem = ({ item, isExpanded }: NavigationItemProps) => {
  const pathname = usePathname();
  const isActive = !item.isExternal && pathname === item.url;

  const content = (
    <StyledListItemButton
      title={item.text}
      selected={isActive}
      sx={{
        justifyContent: isExpanded ? "initial" : "center",
        px: 2.5,
        borderRadius: 1,
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 0,
          mr: isExpanded ? 3 : "auto",
          justifyContent: "center",
        }}
      >
        {item.status && !isExpanded ? (
          <Badge
            color={mapStatusToColor(item.status)}
            variant="dot"
            overlap="circular"
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            sx={{
              "& .MuiBadge-badge": {
                top: 12,
                left: 24,
                borderRadius: "50%",
                opacity: 0.85,
              },
            }}
          >
            {item.icon}
          </Badge>
        ) : (
          item.icon
        )}
      </ListItemIcon>
      <ListItemText
        primary={item.text}
        sx={{
          opacity: isExpanded ? 1 : 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      />
      {item.isExternal && isExpanded && (
        <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
          <OpenInNewIcon sx={{ fontSize: 16, opacity: 0.6 }} />
        </Box>
      )}
      {item.badge && isExpanded && item.badge}
    </StyledListItemButton>
  );

  return (
    <ListItem disablePadding>
      {item.isExternal ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "inherit", width: "100%" }}
        >
          {content}
        </a>
      ) : (
        <Link
          href={item.url}
          passHref
          style={{ textDecoration: "none", color: "inherit", width: "100%" }}
        >
          {content}
        </Link>
      )}
    </ListItem>
  );
};
