import { styled } from "@mui/material/styles";
import { MaterialDesignContent } from "notistack";

// Custom styled MaterialDesignContent for notistack toasts
export const StyledMaterialDesignContent = styled(MaterialDesignContent)(
  ({ theme }) => ({
    "&.notistack-MuiContent-success": {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.success.contrastText,
      boxShadow: theme.shadows[3],
      borderRadius: theme.shape.borderRadius,
    },
    "&.notistack-MuiContent-error": {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      boxShadow: theme.shadows[3],
      borderRadius: theme.shape.borderRadius,
    },
    "&.notistack-MuiContent-warning": {
      backgroundColor: theme.palette.warning.main,
      color: theme.palette.warning.contrastText,
      boxShadow: theme.shadows[3],
      borderRadius: theme.shape.borderRadius,
    },
    "&.notistack-MuiContent-info": {
      backgroundColor: theme.palette.info.main,
      color: theme.palette.info.contrastText,
      boxShadow: theme.shadows[3],
      borderRadius: theme.shape.borderRadius,
    },
    // General toast styling
    minWidth: 320,
    fontWeight: 500,
    fontSize: "1rem",
    padding: theme.spacing(1.5, 2),
    display: "flex",
    alignItems: "center",
  })
);
