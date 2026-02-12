import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiTabs: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiTabs"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      // Apply pill styling when the Tabs root contains the class 'pill'
      "&.pill": {
        borderRadius: 30,
        padding: theme.spacing(0.25),
        backgroundColor: theme.palette.primary.main,
        maxWidth: "fit-content",
        minHeight: "40px",

        "& .MuiTabs-scroller": {
          width: "auto",
        },

        "& .MuiTabs-indicator": {
          height: "100%",
          borderRadius: 24,
          backgroundColor: theme.palette.selectedToggle,
          zIndex: 0,
        },

        "& .MuiTab-root": {
          padding: theme.spacing(1, 2),
          minHeight: "36px",
          lineHeight: 1,

          "&.Mui-selected": {
            color: theme.palette.text.primary,
            zIndex: 1,
          },
        },
      },
    }),
  },
};
