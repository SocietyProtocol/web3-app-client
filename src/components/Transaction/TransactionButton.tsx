import { Button, ButtonProps, CircularProgress, Stack } from "@mui/material";
import { GasEstimation } from "./GasEstimation";

interface TransactionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  simulating?: boolean;
  gas?: bigint;
  gasLoading?: boolean;
  gasError?: boolean;
}

export const TransactionButton = ({
  loading = false,
  simulating = false,
  loadingText,
  children,
  disabled,
  startIcon,
  gas,
  gasLoading,
  gasError,
  ...props
}: TransactionButtonProps) => {
  const showGas = gas || gasLoading;

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Button
        {...props}
        disabled={disabled || loading || simulating}
        startIcon={
          loading || simulating ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            startIcon
          )
        }
      >
        {simulating
          ? "Simulating..."
          : loading
            ? loadingText || "Processing..."
            : children}
      </Button>
      {!disabled && !loading && !simulating && showGas && (
        <GasEstimation value={gas} isLoading={gasLoading} isError={gasError} />
      )}
    </Stack>
  );
};
