import { Alert } from "@mui/material";
import { parseErrorMessage } from "@/utils/errors";

interface SimulationErrorProps {
  error: unknown;
  defaultMessage?: string;
}

export const SimulationError = ({
  error,
  defaultMessage = "Transaction would fail",
}: SimulationErrorProps) => {
  if (!error) return null;

  return (
    <Alert severity="error" data-testid="transaction-simulation-error">
      {parseErrorMessage(error, defaultMessage)}
    </Alert>
  );
};
