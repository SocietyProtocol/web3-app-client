import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiDialog: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiDialog"] = {
  styleOverrides: {
    paper: ({ theme }) => ({
      borderRadius: 16,
      boxShadow: "none",
      backgroundColor: theme.palette.background.page,
      backgroundImage: "none",
      maxWidth: "fit-content",
    }),
  },
};
