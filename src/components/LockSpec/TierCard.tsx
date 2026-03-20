"use client";

import Image from "next/image";
import {
  alpha,
  Box,
  Card,
  CardActionArea,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { TierConfig } from "./types";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { SPEC_DECIMALS } from "./consts";

interface TierCardProps {
  tier: TierConfig;
  amount: bigint | undefined;
  loading?: boolean;
  selected: boolean;
  onSelect: () => void;
}

export const TierCard = ({
  tier,
  selected,
  onSelect,
  amount,
  loading,
}: TierCardProps) => {
  const { iconSrc, name, color, benefits } = tier;

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        bgcolor: (theme) =>
          selected
            ? theme.palette.background.paperDark
            : theme.palette.background.paper,
        border: "1px solid",
        borderColor: (theme) =>
          selected
            ? theme.palette.success.light
            : alpha(theme.palette.primary.main, 0.1),
        borderRadius: 3,
        transition: "border-color, background-color 0.2s",
      }}
    >
      <CardActionArea
        onClick={onSelect}
        aria-pressed={selected}
        sx={{
          px: 1.5,
          py: 1.5,
          height: "100%",
          borderRadius: 3,
        }}
      >
        <Stack spacing={1.5} alignItems="center">
          <Stack alignItems="center" spacing={0.75}>
            <Image src={iconSrc} alt={name} width={36} height={36} />
            <Typography
              sx={{
                color,
                fontWeight: 600,
                fontSize: "1.25rem",
                lineHeight: 1,
              }}
            >
              {name}
            </Typography>
          </Stack>

          {loading ? (
            <Skeleton width={100} height={32} />
          ) : (
            <FormattedNumber
              variant="h6"
              color="primary.main"
              sx={{ fontWeight: 700, textAlign: "center" }}
              value={amount}
              scaleDownDecimals={SPEC_DECIMALS}
              suffix="SPEC"
              hideTooltip
            />
          )}

          <Stack spacing={0.5} sx={{ width: "100%" }}>
            {benefits.map((benefit) => (
              <Box key={benefit} sx={{ display: "flex", gap: 0.75 }}>
                <Typography
                  variant="caption"
                  color="primary.main"
                  sx={{ lineHeight: 1.25, flexShrink: 0, fontSize: "11px" }}
                >
                  •
                </Typography>
                <Typography
                  variant="caption"
                  color="primary.main"
                  sx={{ lineHeight: 1.25, fontSize: "11px" }}
                >
                  {benefit}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
};
