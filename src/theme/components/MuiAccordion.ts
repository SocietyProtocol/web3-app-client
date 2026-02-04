import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiAccordion: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiAccordion"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      background: "transparent",
      boxShadow: "none",
      // single separator: bottom only
      borderBottom: `1px solid ${theme.palette.common.white}`,
      marginBottom: theme.spacing(1), // 8px between accordions
      // remove separator for last accordion
      "&:last-of-type": {
        borderBottom: "none",
        marginBottom: 0,
      },
      "&:before": {
        display: "none",
      },

      "&.Mui-expanded": {
        margin: 0,
      },
    }),
  },
};
