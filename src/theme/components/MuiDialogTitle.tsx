import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiDialogTitle: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiDialogTitle"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(5, 7),
      paddingBottom: theme.spacing(3),
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontWeight: 700,
    }),
  },
};
