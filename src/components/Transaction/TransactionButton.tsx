import { Button, ButtonProps, CircularProgress } from "@mui/material";

interface TransactionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const TransactionButton = ({
  loading = false,
  loadingText,
  children,
  disabled,
  startIcon,
  ...props
}: TransactionButtonProps) => {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={20} /> : startIcon}
    >
      {loading ? loadingText || "Processing..." : children}
    </Button>
  );
};
