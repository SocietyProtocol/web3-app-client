import { Components, CssVarsTheme, Theme } from "@mui/material";

// Augment MUI Paper variant types
declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    bubble: true;
  }
}

export const MuiCard: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiCard"] = {
  variants: [
    {
      props: { variant: "bubble" },
      style: ({ theme }) => ({
        backgroundColor: theme.palette.background.page,
        border: `1px solid ${theme.palette.border.bubble}`,
        borderRadius: 38,
        boxShadow: "none",
        "& .MuiCardHeader-root": {
          padding: theme.spacing(3),
        },
        "& > .MuiCardContent-root": {
          padding: theme.spacing(3),
        },
        "& > .MuiCardActions-root": {
          padding: theme.spacing(3),
        },
      }),
    },
  ],
};
