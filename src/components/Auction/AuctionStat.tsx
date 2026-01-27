"use client";

import { Stack, Typography } from "@mui/material";
import { SafeImage } from "../SafeImage/SafeImage";
import { WithTooltip } from "../WithTooltip/WithTooltip";

export interface AuctionStatProps {
  icon?: string;
  label: string;
  value: string;
  tooltip?: string;
}

export const AuctionStat = ({
  icon,
  label,
  value,
  tooltip,
}: AuctionStatProps) => {
  return (
    <Stack spacing={1} alignItems="center">
      <Stack direction="row" alignItems="center" spacing={1}>
        {icon && <SafeImage src={icon} alt={label} width={24} height={24} />}
        <Typography
          component="div"
          color="primary.main"
          sx={{
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {value}
        </Typography>
      </Stack>
      <WithTooltip
        component="div"
        color="primary.main"
        sx={{
          fontSize: 14,
          fontWeight: 400,
        }}
        tooltip={tooltip}
        iconPosition="end"
      >
        {label}
      </WithTooltip>
    </Stack>
  );
};
