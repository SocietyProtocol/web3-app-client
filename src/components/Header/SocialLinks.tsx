import { Box, Tooltip, Typography } from "@mui/material";
import type { Breakpoint, SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { Logo } from "@/components/icons/Logo";
import {
  DiscordOutlineIcon,
  XGlyphIcon,
  YouTubeOutlineIcon,
} from "@/components/icons/SocialIcons";
import {
  getSocialLinks,
  NEW_TAB_SUFFIX,
  type SocialLink,
  type SocialLinkId,
} from "@/consts/socialLinks";

type Variant = "header" | "drawer";
type ResponsiveSize = number | Partial<Record<Breakpoint, number>>;

// Header: compact (40px circles) from md, full (48px) from lg.
// Drawer: 40px circles, wrapping onto a second line.
const SIZES = {
  header: {
    circle: { md: 40, lg: 48 },
    pillHeight: { md: 26, lg: 32 },
    pillWidth: { md: 104, lg: 125 },
    gap: { md: 1, lg: 1.5 },
    fontSize: { md: 14, lg: 16 },
    mark: { md: 26, lg: 32 },
    glyph: { md: 24, lg: 30 },
    x: { md: 16, lg: 18 },
  },
  drawer: {
    circle: 40,
    pillHeight: 26,
    pillWidth: 104,
    gap: 1,
    fontSize: 14,
    mark: 26,
    glyph: 24,
    x: 16,
  },
} as const;

const renderGlyph = (id: SocialLinkId, variant: Variant) => {
  const { glyph, x } = SIZES[variant];
  switch (id) {
    case "youtube":
      return (
        <YouTubeOutlineIcon
          aria-hidden
          sx={{ fontSize: glyph, color: "brand.youtube" }}
        />
      );
    case "discord":
      return (
        <DiscordOutlineIcon
          aria-hidden
          sx={{ fontSize: glyph, color: "brand.discord" }}
        />
      );
    case "x":
      return <XGlyphIcon aria-hidden sx={{ fontSize: x, color: "brand.x" }} />;
    default:
      return null;
  }
};

const linkSx = (theme: Theme) => ({
  position: "relative" as const,
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  color: theme.palette.brand.outline,
  textDecoration: "none",
  borderRadius: "999px",
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.brand.outline}`,
    outlineOffset: "2px",
  },
  // "Selected" in the design = hover, keyboard focus and pressed.
  "&:hover .social-pill, &:focus-visible .social-pill, &:active .social-pill": {
    backgroundColor: theme.palette.action.selected,
  },
  "&:hover .social-circle, &:focus-visible .social-circle, &:active .social-circle":
    {
      // Tint the opaque circle with the same translucent fill as the pill.
      boxShadow: `inset 0 0 0 999px ${theme.palette.action.selected}`,
    },
});

const fillTransition = (theme: Theme) =>
  theme.transitions.create(["background-color", "box-shadow"], {
    duration: 150,
  });

interface CircleProps {
  size: ResponsiveSize;
  surface: "default" | "page";
  children: ReactNode;
}

// The circle is opaque so it hides the pill's border behind it.
const Circle = ({ size, surface, children }: CircleProps) => (
  <Box
    className="social-circle"
    sx={{
      position: "relative",
      boxSizing: "border-box",
      width: size,
      height: size,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      border: "1.5px solid",
      borderColor: "brand.outline",
      backgroundColor: `background.${surface}`,
      transition: fillTransition,
    }}
  >
    {children}
  </Box>
);

interface LinkProps {
  link: SocialLink;
  variant: Variant;
}

const PillLink = ({ link, variant }: LinkProps) => {
  const size = SIZES[variant];
  return (
    <Box
      component="a"
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${link.name}${NEW_TAB_SUFFIX}`}
      data-testid={`shell-social-link-${link.id}`}
      sx={[linkSx, { width: size.pillWidth, height: size.circle }]}
    >
      <Box
        className="social-pill"
        aria-hidden
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          boxSizing: "border-box",
          height: size.pillHeight,
          border: "1.5px solid",
          borderColor: "brand.outline",
          borderRadius: "999px",
          transition: fillTransition,
        }}
      />
      <Circle
        size={size.circle}
        surface={variant === "drawer" ? "page" : "default"}
      >
        <Logo aria-hidden sx={{ fontSize: size.mark, color: "brand.teal" }} />
      </Circle>
      <Typography
        component="span"
        data-testid="shell-social-label"
        sx={{
          position: "relative",
          flex: 1,
          textAlign: "center",
          color: "brand.outline",
          fontFamily: (theme) => theme.typography.subtitle1.fontFamily,
          fontSize: size.fontSize,
          letterSpacing: "normal",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {link.label}
      </Typography>
    </Box>
  );
};

const CircleLink = ({ link, variant }: LinkProps) => {
  const size = SIZES[variant];
  return (
    <Tooltip title={link.name} arrow>
      <Box
        component="a"
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${link.name}${NEW_TAB_SUFFIX}`}
        data-testid={`shell-social-link-${link.id}`}
        sx={linkSx}
      >
        <Circle
          size={size.circle}
          surface={variant === "drawer" ? "page" : "default"}
        >
          {renderGlyph(link.id, variant)}
        </Circle>
      </Box>
    </Tooltip>
  );
};

interface SocialLinksProps {
  variant: Variant;
  sx?: SxProps<Theme>;
}

export const SocialLinks = ({ variant, sx }: SocialLinksProps) => (
  <Box
    component="nav"
    aria-label="Society Protocol links"
    data-testid="shell-social-links"
    sx={[
      {
        display: "flex",
        alignItems: "center",
        flexWrap: variant === "drawer" ? "wrap" : "nowrap",
        gap: SIZES[variant].gap,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {getSocialLinks().map((link) =>
      link.kind === "pill" ? (
        <PillLink key={link.id} link={link} variant={variant} />
      ) : (
        <CircleLink key={link.id} link={link} variant={variant} />
      ),
    )}
  </Box>
);
