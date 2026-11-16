import { Button, ButtonProps, CircularProgress, Stack } from "@mui/material";
import { GasEstimation } from "./GasEstimation";
import type { OutpostRouteKind } from "@/lib/outpost-routing";

interface TransactionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  simulating?: boolean;
  /** Who pays (useTransaction's routeKind): "Free" or "Paid by your wallet". */
  routeKind?: OutpostRouteKind;
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
  routeKind,
  gas,
  gasLoading,
  gasError,
  ...props
}: TransactionButtonProps) => {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
    >
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
      {!disabled && !loading && !simulating && (
        <GasEstimation
          routeKind={routeKind}
          value={gas}
          isLoading={gasLoading}
          isError={gasError}
        />
      )}
    </Stack>
  );
};
