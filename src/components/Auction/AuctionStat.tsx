"use client";

import { Skeleton, Stack, Typography } from "@mui/material";
import { SafeImage } from "../SafeImage/SafeImage";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { ReactNode } from "react";

export interface AuctionStatProps {
  icon?: string;
  label: string;
  value?: string | ReactNode;
  tooltip?: string;
  loading?: boolean;
}

export const AuctionStat = ({
  icon,
  label,
  value,
  tooltip,
  loading,
}: AuctionStatProps) => {
  return (
    <Stack spacing={1} alignItems="center">
      {loading ? (
        <Skeleton variant="rectangular" width={100} height={24} />
      ) : (
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon && <SafeImage src={icon} alt={label} width={24} height={24} />}
          {typeof value === "string" ? (
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
          ) : (
            value
          )}
        </Stack>
      )}
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
