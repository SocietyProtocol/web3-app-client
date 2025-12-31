import { Components, CssVarsTheme, Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export const MuiTextField: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiTextField"] = {
  defaultProps: {
    variant: "outlined",
  },
  styleOverrides: {
    root: ({ theme }) => ({
      "& .MuiOutlinedInput-root": {
        borderRadius: "8px",
        backgroundColor: theme.palette.background.input,
        fontSize: "14px",
        lineHeight: "20px",
        fontWeight: 400,
        color: theme.palette.text.primary,

        "&.MuiInputBase-multiline": {
          padding: theme.spacing(1, 1.5),
          "& > .MuiOutlinedInput-input": {
            padding: 0,
          },
        },

        ".MuiOutlinedInput-notchedOutline": {
          transition: theme.transitions.create(
            ["border-color", "background-color", "box-shadow"],
            {
              duration: theme.transitions.duration.shorter,
              easing: theme.transitions.easing.easeInOut,
            }
          ),
        },

        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: alpha(theme.palette.primary.main, 0.25),
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderWidth: "1px",
          borderColor: alpha(theme.palette.primary.main, 0.5),
        },
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderWidth: "1px",
        borderColor: theme.palette.border.input,
      },
      "& .MuiOutlinedInput-input": {
        "&::placeholder": {
          color: alpha(theme.palette.text.primary, 0.5),
          opacity: 1,
        },
      },
      "& .MuiInputLabel-root": {
        "&.Mui-focused": {
          color: theme.palette.primary.main,
        },
      },
    }),
  },
};
