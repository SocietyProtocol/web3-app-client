import { Paper, styled } from "@mui/material";

export const UserCardPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== "size" && prop !== "highlight",
})<{
  size: "large" | "medium" | "small";
  highlight?: boolean;
}>(({ theme, size, highlight }) => ({
  padding: theme.spacing(size === "large" ? 2 : 1, 1),
  borderRadius: Number(theme.shape.borderRadius) * 2,
  boxShadow: "none",
  minHeight: size === "large" ? 220 : "unset",
  width: size === "large" ? 214 : 140,
  position: "relative",

  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },

  ...(highlight && {
    border: `1px solid ${theme.palette.success.contrastText}`,
    "&::before": {
      content: '"YOU"',
      position: "absolute",
      top: 0,
      left: 0,
      color: theme.palette.success.contrastText,
      padding: theme.spacing(1),
      fontSize: theme.typography.pxToRem(10),
      fontWeight: 700,
    },
  }),
}));
