import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiChip: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiChip"] = {
  variants: [
    {
      props: { variant: "filled", color: "default" },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.neutral.main,
        color: theme.palette.text.primary,
      }),
    },
    {
      props: { variant: "filled", color: "success" },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.success.main,
        color: theme.palette.success.contrastText,
      }),
    },
    {
      props: { variant: "filled", color: "warning" },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.warning.main,
        color: theme.palette.warning.contrastText,
      }),
    },
    {
      props: { variant: "filled", color: "error" },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
      }),
    },
    {
      props: { variant: "filled", color: "info" },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.info.main,
        color: theme.palette.info.contrastText,
      }),
    },
    {
      props: { variant: "filled", color: "gold" },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.gold.dark,
        color: theme.palette.gold.contrastText,
      }),
    },
  ],
};
