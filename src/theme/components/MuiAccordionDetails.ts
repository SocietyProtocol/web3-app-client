import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiAccordionDetails: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiAccordionDetails"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3), // 24px
      paddingTop: 0,
      "& > ol": {
        paddingLeft: theme.spacing(2), // 16px
      },
      "& .MuiTypography-root": {
        fontSize: theme.typography.pxToRem(16),
        fontWeight: 400,
        lineHeight: "24px",
        color: theme.palette.text.primary,
      },
    }),
  },
};
