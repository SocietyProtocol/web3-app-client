import { Box, Stack, Typography } from "@mui/material";
import { SPEC_DECIMALS, getLockDurationLabel, getUnlockDate } from "./consts";
import { LockDuration, TierConfig } from "./types";
import { ReactNode } from "react";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";

interface SummaryRowProps {
  label: string;
  value: ReactNode;
}

const SummaryRow = ({ label, value }: SummaryRowProps) => (
  <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5 }}>
    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
      {label}
    </Typography>
    <Box
      sx={{
        flex: 1,
        borderBottom: "1px dotted",
        borderColor: "border.card",
        mb: "4px",
        opacity: 0.5,
      }}
    />
    {typeof value === "string" ? (
      <Typography variant="body2" color="text.primary" sx={{ flexShrink: 0 }}>
        {value}
      </Typography>
    ) : (
      value
    )}
  </Box>
);

interface LockSummaryProps {
  tier: TierConfig;
  duration: LockDuration;
}

export const LockSummary = ({ tier, duration }: LockSummaryProps) => {
  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
        Summary
      </Typography>

      <Stack spacing={0.75}>
        <SummaryRow label="Plan:" value={tier.name} />
        <SummaryRow
          label="Amount:"
          value={
            <FormattedNumber
              value={tier.requiredSpec}
              suffix=" SPEC"
              scaleDownDecimals={SPEC_DECIMALS}
              variant="body2"
              color="text.primary"
              sx={{ flexShrink: 0 }}
              compact
            />
          }
        />
        <SummaryRow
          label="Lock duration:"
          value={getLockDurationLabel(duration)}
        />
        <SummaryRow label="Unlock date:" value={getUnlockDate(duration)} />
      </Stack>
    </Stack>
  );
};
