import { Components, CssVarsTheme, Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";

export const MuiTextField: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiTextField"] = {
  defaultProps: {
    variant: "outlined",
    InputLabelProps: {
      shrink: true,
    },
  },
  styleOverrides: {
    root: ({ theme, ownerState }) => ({
      "& .MuiOutlinedInput-root": {
        borderRadius: "8px",
        backgroundColor: theme.palette.background.input,
        fontSize: theme.typography.pxToRem(14),
        lineHeight: theme.typography.pxToRem(20),
        fontWeight: 400,
        color: theme.palette.text.primary,
        height: ownerState.size === "small" ? "42px" : "56px",

        "&.MuiInputBase-multiline": {
          padding: theme.spacing(1, 1.5),
          height: "auto",

          "& > .MuiOutlinedInput-input": {
            padding: 0,
          },
        },

        "& .MuiOutlinedInput-input": {
          padding: theme.spacing(2.25, 1.5),
          "&::placeholder": {
            color: alpha(theme.palette.text.primary, 0.5),
            opacity: 1,
            transition: theme.transitions.create("color", {
              duration: theme.transitions.duration.shorter,
              easing: theme.transitions.easing.easeInOut,
            }),
          },
        },

        ".MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.background.subtle,
          borderWidth: "1px",
          top: 0,

          transition: theme.transitions.create("border-color", {
            duration: theme.transitions.duration.shorter,
            easing: theme.transitions.easing.easeInOut,
          }),
        },

        "&:hover:not(.Mui-disabled)": {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.primary.main, 0.75),
          },

          "& .MuiOutlinedInput-input": {
            "&::placeholder": {
              color: alpha(theme.palette.text.primary, 0.75),
              opacity: 1,
            },
          },
        },

        "&.Mui-focused:not(.Mui-disabled)": {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
            borderWidth: "1px",
          },

          "& .MuiOutlinedInput-input": {
            "&::placeholder": {
              color: alpha(theme.palette.text.primary, 0.9),
              opacity: 1,
            },
          },
        },

        "&.Mui-disabled": {
          opacity: 0.5,

          "& .MuiOutlinedInput-input": {
            "&::placeholder": {
              color: alpha(theme.palette.text.primary, 0.3),
              opacity: 1,
            },
          },
        },

        "&.Mui-error:not(.Mui-disabled)": {
          color: theme.palette.error.main,

          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.background.subtle,
          },
        },
      },
      "& .MuiInputLabel-root": {
        position: "relative",
        transform: "none",
        marginBottom: theme.spacing(2),
        fontSize: theme.typography.pxToRem(16),
        fontWeight: 400,
        color: theme.palette.text.primary,
      },

      "& .MuiOutlinedInput-notchedOutline legend": {
        display: "none",
      },

      "& .MuiFormHelperText-root.Mui-error": {
        color: theme.palette.error.main,
      },
    }),
  },
};
