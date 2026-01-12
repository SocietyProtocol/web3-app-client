import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiPaginationItem: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiPaginationItem"] = {
  styleOverrides: {
    root: () => ({
      fontWeight: 700,
      borderRadius: 8,
    }),
  },
};
