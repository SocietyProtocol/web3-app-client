"use client";

import { Stack, Tooltip, Typography } from "@mui/material";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { SafeImage } from "../SafeImage/SafeImage";

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
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography
          component="div"
          color="primary.main"
          sx={{
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          {label}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip} arrow placement="top">
            <InfoOutlineIcon sx={{ cursor: "help", fontSize: 16 }} />
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
};
