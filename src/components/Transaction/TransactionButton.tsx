import { Button, ButtonProps, CircularProgress } from "@mui/material";

interface TransactionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  simulating?: boolean;
}

export const TransactionButton = ({
  loading = false,
  simulating = false,
  loadingText,
  children,
  disabled,
  startIcon,
  ...props
}: TransactionButtonProps) => {
  return (
    <Button
      {...props}
      disabled={disabled || loading || simulating}
      startIcon={
        loading || simulating ? <CircularProgress size={20} /> : startIcon
      }
    >
      {simulating
        ? "Simulating..."
        : loading
          ? loadingText || "Processing..."
          : children}
    </Button>
  );
};
