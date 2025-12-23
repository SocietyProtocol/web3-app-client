import { Components, CssVarsTheme, Theme } from "@mui/material";

// Augment MUI Button variant types
declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    wallet: true;
  }
}

export const MuiButton: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiButton"] = {
  defaultProps: {
    disableElevation: true,
    disableRipple: true,
  },
  variants: [
    {
      props: { variant: "wallet" },
      style: {
        background: "#0000001A",
        border: "none",
      },
    },
  ],
  styleOverrides: {
    root: {
      borderRadius: 50,
      border: "1.48px solid currentColor",
    },
    text: {
      border: "none",
      borderRadius: 50,
    },
    sizeLarge: ({ theme }) => ({
      height: 32,
      lineHeight: "24px",
      padding: theme.spacing(0.5, 1),
      fontSize: theme.typography.pxToRem(12),
    }),
    sizeMedium: ({ theme }) => ({
      height: 48,
      lineHeight: "24px",
      padding: theme.spacing(1.5, 2),
      fontSize: theme.typography.pxToRem(16),
    }),
    sizeSmall: ({ theme }) => ({
      height: 56,
      lineHeight: "24px",
      padding: theme.spacing(2, 2.25),
      fontSize: theme.typography.pxToRem(18),
    }),
  },
};
