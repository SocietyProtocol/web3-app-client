import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiSelect: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiSelect"] = {
  variants: [
    {
      props: { variant: "standard" },
      style: ({ theme }) => ({
        border: "none",
        fontWeight: 700,
        margin: 0,
        padding: 0,
        height: "29px",
        "& .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "& .MuiSelect-select": {
          padding: 0,
          margin: 0,
        },
        "& .MuiSelect-icon": {
          color: theme.palette.common.white,
        },
        "& .MuiInputLabel-root": {
          position: "relative",
          transform: "none",
          display: "inline",
          marginRight: theme.spacing(1),
        },
      }),
    },
  ],
};
