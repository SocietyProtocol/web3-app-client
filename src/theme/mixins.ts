import type { Theme } from "@mui/material/styles";

export const createCustomMixins = (theme: Theme) => ({
  borderGradient: (
    borderRadius: string | number = "10px",
    gradient: keyof Theme["palette"]["gradients"] = "primary"
  ) => {
    const backgroundGradient = `${theme.palette.gradients[gradient]} border-box`;

    return {
      "&::before": {
        content: '""',
        position: "absolute" as const,
        inset: 0,
        borderRadius,
        padding: "1px",
        background: backgroundGradient,
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude" as const,
        pointerEvents: "none" as const,
        zIndex: 1,
      },
    };
  },
});
