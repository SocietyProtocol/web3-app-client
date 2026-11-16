import Image from "next/image";
import { ConnectButton } from "@/components/Wallet/ConnectButton";
import { Box, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";
import { SocialLinks } from "./SocialLinks";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: { xs: "8px 16px", sm: "8px 20px", md: "8px 24px" },
        position: "sticky",
        top: 0,
        backgroundColor: "transparent",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        scrollbarGutter: "stable",
        gap: { xs: 1, sm: 2 },
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}
      >
        {/* Mobile Menu Button */}
        <IconButton
          onClick={onMenuClick}
          aria-label="Open menu"
          data-testid="shell-menu-button"
          sx={{
            display: { xs: "flex", md: "none" },
            color: "text.primary",
            padding: { xs: 1, sm: 1.5 },
          }}
        >
          <MenuIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
        </IconButton>

        <Link href="/" aria-label="Society Protocol Home">
          <Box
            sx={{
              width: { xs: 150, sm: 200, md: 233 },
              height: { xs: 20, sm: 26, md: 32 },
              position: "relative",
            }}
          >
            <Image
              src="/logo/logo-dark.svg"
              alt="Society Protocol Logo"
              fill
              priority
              style={{ objectFit: "contain" }}
            />
          </Box>
        </Link>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { md: 2, lg: 3 },
          minWidth: 0,
        }}
      >
        {/* Below md the links live in the mobile drawer instead */}
        <SocialLinks
          variant="header"
          sx={{ display: { xs: "none", md: "flex" } }}
        />
        {/* Cap long profile names so the links and the button fit from md */}
        <ConnectButton sx={{ minWidth: 0, maxWidth: { md: 260, lg: 360 } }} />
      </Box>
    </Box>
  );
};
