import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiSwitch: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiSwitch"] = {
  defaultProps: {
    disableRipple: true,
  },
  styleOverrides: {
    root: {
      width: 36,
      height: 20,
      padding: 0,
      marginRight: 8,
      display: "flex",
      alignItems: "center",
    },

    switchBase: ({ theme }) => ({
      padding: 0,
      margin: 2,
      transitionDuration: "300ms",

      ["& + .MuiSwitch-track"]: {
        borderRadius: "18px",
        width: 36,
        height: 20,
        opacity: 1,
        border: "none",
        backgroundColor: theme.palette.background.input,
      },

      ["& .MuiSwitch-thumb"]: {
        width: 16,
        height: 16,
        boxShadow: "none",
      },

      "&.Mui-checked": {
        transform: `translateX(16px)`,
        color: theme.palette.common.white,

        ["& + .MuiSwitch-track"]: {
          backgroundColor: theme.palette.success.main,
          opacity: 1,
          border: 0,
        },
      },
    }),
  },
};
