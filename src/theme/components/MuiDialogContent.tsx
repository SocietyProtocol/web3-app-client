import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiDialogContent: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiDialogContent"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(5, 7),
    }),
  },
};
