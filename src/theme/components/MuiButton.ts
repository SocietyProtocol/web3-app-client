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
      style: ({ theme }) => ({
        background: theme.palette.background.subtle,
        border: "none",
      }),
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
    sizeSmall: ({ theme }) => ({
      height: 28,
      lineHeight: "20px",
      padding: theme.spacing(0.5, 1),
      fontSize: theme.typography.pxToRem(11),
      minWidth: "auto",
      [theme.breakpoints.up("sm")]: {
        height: 32,
        lineHeight: "24px",
        padding: theme.spacing(0.75, 1.5),
        fontSize: theme.typography.pxToRem(12),
      },
      [theme.breakpoints.up("md")]: {
        height: 36,
        padding: theme.spacing(1, 2),
        fontSize: theme.typography.pxToRem(13),
      },
    }),
    sizeMedium: ({ theme }) => ({
      height: 32,
      lineHeight: "24px",
      padding: theme.spacing(0.5, 1),
      fontSize: theme.typography.pxToRem(12),
      minWidth: "auto",
      [theme.breakpoints.up("sm")]: {
        height: 40,
        padding: theme.spacing(1, 2),
        fontSize: theme.typography.pxToRem(14),
        minWidth: "100px",
      },
      [theme.breakpoints.up("md")]: {
        height: 48,
        padding: theme.spacing(1.5, 2),
        fontSize: theme.typography.pxToRem(16),
      },
    }),
    sizeLarge: ({ theme }) => ({
      height: 40,
      lineHeight: "28px",
      padding: theme.spacing(1, 1.5),
      fontSize: theme.typography.pxToRem(14),
      minWidth: "auto",
      [theme.breakpoints.up("sm")]: {
        height: 48,
        lineHeight: "32px",
        padding: theme.spacing(1.5, 2),
        fontSize: theme.typography.pxToRem(16),
        minWidth: "120px",
      },
      [theme.breakpoints.up("md")]: {
        height: 56,
        lineHeight: "36px",
        padding: theme.spacing(2, 2.25),
        fontSize: theme.typography.pxToRem(18),
      },
    }),
  },
};
