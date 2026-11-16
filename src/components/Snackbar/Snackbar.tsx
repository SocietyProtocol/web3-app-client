import { forwardRef } from "react";
import { alpha, styled } from "@mui/material/styles";
import { CustomContentProps, MaterialDesignContent } from "notistack";

// Custom styled MaterialDesignContent for notistack toasts
const StyledContent = styled(MaterialDesignContent)(
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

/**
 * The toast, with hooks for browser tests on its message: data-testid is
 * `snackbar-<variant>` and data-snackbar-key is the notistack key (useTransaction
 * keys end in -pending, -notice, -submitted, -success or -error). notistack
 * does not pass unknown props to the toast root, hence the span.
 */
export const StyledMaterialDesignContent = forwardRef<
  HTMLDivElement,
  CustomContentProps
>(function SnackbarContent(props, ref) {
  return (
    <StyledContent
      ref={ref}
      {...props}
      message={
        <span
          data-testid={`snackbar-${props.variant}`}
          data-snackbar-key={String(props.id)}
        >
          {props.message}
        </span>
      }
    />
  );
});
