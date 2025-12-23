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
      background: "#ffffff0c",
      zIndex: -1,
      pointerEvents: "none",
    },

    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "10px",
      padding: "1px",
      background: "linear-gradient(to bottom, #FFFFFFFF, #FFFFFF50) border-box",
      WebkitMask:
        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
      WebkitMaskComposite: "xor",
      maskComposite: "exclude",
      pointerEvents: "none",
      zIndex: -1,
    },

    "&:hover": {
      backgroundColor: "transparent",

      "::after": {
        content: '""',
        position: "absolute",
        inset: 1, // ⬅️ matches border thickness
        borderRadius: 9, // ⬅️ radius - border
        background: "#ffffff1c",
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
      background: "#ffffff1c",
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
        {item.badge && !isExpanded ? (
          <Badge
            color="success"
            variant="dot"
            overlap="circular"
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            sx={{
              "& .MuiBadge-badge": {
                width: 12,
                height: 12,
                borderRadius: "50%",
              },
            }}
          >
            {item.icon}
          </Badge>
        ) : (
          item.icon
        )}
      </ListItemIcon>
      <ListItemText primary={item.text} sx={{ opacity: isExpanded ? 1 : 0 }} />
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
