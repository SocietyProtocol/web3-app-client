import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiDialogTitle: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiDialogTitle"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(4, 3, 0),
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontWeight: 700,
    }),
  },
};
