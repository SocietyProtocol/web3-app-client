import { Box, TextField } from "@mui/material";
import { WithTooltip } from "../WithTooltip/WithTooltip";

interface BadgeAmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** The holder's balance; shown under the field. */
  max: bigint;
  tooltip: string;
  disabled?: boolean;
  error?: string;
}

/** Whole-number amount for burning or transferring copies of a badge. */
export const BadgeAmountField = ({
  value,
  onChange,
  onBlur,
  max,
  tooltip,
  disabled,
  error,
}: BadgeAmountFieldProps) => (
  <Box>
    <WithTooltip
      variant="subtitle1"
      fontWeight={600}
      mb={0.5}
      tooltip={tooltip}
    >
      Amount
    </WithTooltip>
    <TextField
      fullWidth
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      error={!!error}
      helperText={error ?? `Holds ${max}`}
      slotProps={{
        htmlInput: { inputMode: "numeric", "aria-label": "Amount" },
      }}
    />
  </Box>
);
