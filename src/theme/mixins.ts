import { alpha, type Theme } from "@mui/material/styles";

export const createCustomMixins = (theme: Theme) => ({
  backgroundGradient: (
    angle: string = "45deg",
    color: "gold" | "silver" | "bronze" | "primary",
    startOpacity: number = 0.1,
    endOpacity: number = 0,
  ) => {
    const gradientColor =
      color === "primary"
        ? theme.palette.primary.main
        : theme.palette[color].light;

    return {
      background: `linear-gradient(${angle}, ${alpha(gradientColor, startOpacity)} 0%, ${alpha(gradientColor, endOpacity)} 100%)`,
    };
  },

  borderGradient: (
    borderRadius: string | number = "10px",
    color: "gold" | "silver" | "bronze" | "primary" = "primary",
    angle: string = "180deg",
  ) => {
    const startColor =
      color === "primary"
        ? theme.palette.primary.main
        : theme.palette[color].light;
    const endColor =
      color === "primary"
        ? theme.palette.primary.main
        : theme.palette[color].main;

    const backgroundGradient = `linear-gradient(${angle}, ${startColor} 0%, ${endColor} 100%) border-box`;

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
