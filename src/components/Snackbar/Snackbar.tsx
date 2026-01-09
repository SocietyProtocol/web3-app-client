import { alpha, styled } from "@mui/material/styles";
import { MaterialDesignContent } from "notistack";

// Custom styled MaterialDesignContent for notistack toasts
export const StyledMaterialDesignContent = styled(MaterialDesignContent)(
  ({ theme }) => ({
    "&.notistack-MuiContent-success": {
      color: theme.palette.success.light,
      border: `1px solid ${theme.palette.success.main}`,
    },
    "&.notistack-MuiContent-error": {
      color: theme.palette.error.light,
      border: `1px solid ${theme.palette.error.main}`,
    },
    "&.notistack-MuiContent-warning": {
      color: theme.palette.warning.light,
      border: `1px solid ${theme.palette.warning.light}`,
    },
    "&.notistack-MuiContent-info": {
      color: theme.palette.info.light,
      border: `1px solid ${theme.palette.info.main}`,
    },

    // General toast styling
    borderRadius: "16px",
    boxShadow: theme.shadows[3],
    backgroundColor: alpha(theme.palette.background.bubble, 0.7),
    backgroundClip: "padding-box",
    backdropFilter: "blur(12px)",
    minWidth: 320,
    fontWeight: 500,
    fontSize: "1rem",
    padding: theme.spacing(1.5, 2),
    display: "flex",
    alignItems: "center",
  })
);
