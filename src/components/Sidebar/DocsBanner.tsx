import { Box, Tooltip, Typography } from "@mui/material";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import { Logo } from "@/components/icons/Logo";
import { NEW_TAB_SUFFIX } from "@/consts/socialLinks";
import { URLS } from "@/consts/urls";

const DOCS_HOST = new URL(URLS.DOCS).host;
const SHORT_SCREEN = "@media (max-height: 760px)";

interface DocsBannerProps {
  isExpanded: boolean;
}

// Not a navigation item: it must not carry data-testid="shell-nav-item".
export const DocsBanner = ({ isExpanded }: DocsBannerProps) => (
  <Tooltip title={isExpanded ? "" : "Documentation"} placement="right" arrow>
    <Box
      component="a"
      href={URLS.DOCS}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Documentation${NEW_TAB_SUFFIX}`}
      data-testid="shell-docs-banner"
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        justifyContent: isExpanded ? "flex-start" : "center",
        gap: 2,
        flexShrink: 0,
        boxSizing: "border-box",
        mx: isExpanded ? 0 : "auto",
        mb: 1,
        width: isExpanded ? "100%" : 48,
        height: isExpanded ? "auto" : 48,
        minHeight: isExpanded ? 80 : 48,
        p: isExpanded ? 2 : 0,
        color: "text.primary",
        textDecoration: "none",
        border: `1.5px solid ${theme.palette.brand.outline}`,
        borderRadius: "10px",
        transition: theme.transitions.create("background-color", {
          duration: 150,
        }),
        "&:hover": { backgroundColor: theme.palette.action.hover },
        "&:focus-visible, &:active": {
          backgroundColor: theme.palette.action.selected,
        },
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.brand.outline}`,
          outlineOffset: "2px",
        },
        // Keep the Collapse row reachable on short screens.
        [SHORT_SCREEN]: isExpanded ? { minHeight: 0, py: 1.5 } : {},
      })}
    >
      <Logo
        aria-hidden
        sx={{ fontSize: isExpanded ? 32 : 28, color: "brand.teal" }}
      />
      {isExpanded && (
        <>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              data-testid="shell-docs-banner-label"
              sx={{
                fontFamily: (theme) => theme.typography.subtitle1.fontFamily,
                fontSize: 16,
                letterSpacing: "normal",
                color: "brand.outline",
                whiteSpace: "nowrap",
              }}
            >
              Documentation
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                [SHORT_SCREEN]: { display: "none" },
              }}
            >
              {DOCS_HOST}
            </Typography>
          </Box>
          <NorthEastIcon aria-hidden sx={{ fontSize: 18, opacity: 0.8 }} />
        </>
      )}
    </Box>
  </Tooltip>
);
