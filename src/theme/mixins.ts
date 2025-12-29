import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";

export const createCustomMixins = (theme: Theme) => ({
  borderGradient: (borderRadius: string | number = "10px") => ({
    "&::before": {
      content: '""',
      position: "absolute" as const,
      inset: 0,
      borderRadius,
      padding: "1px",
      background: `linear-gradient(to bottom, ${
        theme.palette.primary.main
      }, ${alpha(theme.palette.primary.main, 0.31)}) border-box`,
      mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
      maskComposite: "exclude" as const,
      pointerEvents: "none" as const,
      zIndex: -1,
    },
  }),
});
