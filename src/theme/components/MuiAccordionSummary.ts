import { Components, CssVarsTheme, Theme } from "@mui/material";

export const MuiAccordionSummary: Components<
  Omit<Theme, "palette" | "components"> & CssVarsTheme
>["MuiAccordionSummary"] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3), // 24px
      minHeight: "unset",
      "&.Mui-expanded": {
        minHeight: "unset",
      },
    }),
    content: ({ theme }) => ({
      margin: 0,
      "& > *": {
        fontSize: theme.typography.pxToRem(18),
        fontWeight: 700,
        lineHeight: "24px",
        color: theme.palette.primary[100],
      },
      "&.Mui-expanded": {
        margin: 0,
      },
    }),
    expandIconWrapper: ({ theme }) => ({
      width: 24,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      "& .MuiSvgIcon-root": {
        fontSize: theme.typography.pxToRem(24),
        width: 24,
        height: 24,
        color: theme.palette.common.white,
      },
    }),
  },
};
