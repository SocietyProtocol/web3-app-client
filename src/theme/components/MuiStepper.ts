import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiStepper: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiStepper"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      "& .MuiStepLabel-label": {
        fontSize: "0.875rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: theme.palette.text.disabled,
        "&.Mui-completed": {
          color: theme.palette.text.secondary,
          fontWeight: 600,
        },
        "&.Mui-active": {
          fontWeight: 700,
          color: `${theme.palette.primary.main} !important`,
        },
        [theme.breakpoints.up("sm")]: {
          fontSize: "1rem",
        },
        [theme.breakpoints.up("md")]: {
          fontSize: "1.125rem",
        },
      },
    }),
  },
};
