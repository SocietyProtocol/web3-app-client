import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiDialogActions: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiDialogActions"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(0, 3, 4),
    }),
  },
};
