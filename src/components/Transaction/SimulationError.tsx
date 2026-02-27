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
    <Alert severity="error">{parseErrorMessage(error, defaultMessage)}</Alert>
  );
};
