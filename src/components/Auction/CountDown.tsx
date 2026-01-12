"use client";

import {
  alpha,
  Stack,
  styled,
  Typography,
  TypographyProps,
} from "@mui/material";
import { useEffect, useState } from "react";

interface CountDownProps {
  endTimestamp: number;
}

const Cell = styled("div")(({ theme }) => ({
  width: 64,
  height: 60,
  borderRadius: 12,
  backgroundColor: theme.palette.background.page,
  border: `1px solid ${theme.palette.border.counter}`,
  boxShadow: `inset 0 4px 4px 0 ${alpha("#656565", 0.25)}`,
  padding: theme.spacing(0.5, 1),
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
}));

const StyledNumber = styled(Typography)<TypographyProps<"span">>(
  ({ theme }) => ({
    fontSize: theme.typography.pxToRem(24),
    fontWeight: 700,
    textAlign: "center",
    color: theme.palette.primary.main,
  })
);

const StyledLetter = styled(Typography)<TypographyProps<"span">>(
  ({ theme }) => ({
    fontSize: theme.typography.pxToRem(24),
    fontWeight: 200,
    textAlign: "center",
    color: theme.palette.primary.main,
  })
);

export const CountDown = ({ endTimestamp }: CountDownProps) => {
  const [{ days, hours, minutes, seconds }, setTimeLeft] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = endTimestamp * 1000 - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
        });
        return;
      }

      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        days: String(d).padStart(2, "0"),
        hours: String(h).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [endTimestamp]);

  return (
    <Stack spacing={1} alignItems="center">
      <Typography
        color="primary"
        fontWeight={400}
        sx={{
          fontSize: (theme) => theme.typography.pxToRem(16),
        }}
      >
        ENDS IN
      </Typography>
      <Stack direction="row" spacing={1}>
        <Cell>
          <StyledNumber component="span">
            {days}
            <StyledLetter component="span">d</StyledLetter>
          </StyledNumber>
        </Cell>
        <Cell>
          <StyledNumber component="span">
            {hours}
            <StyledLetter component="span">h</StyledLetter>
          </StyledNumber>
        </Cell>
        <Cell>
          <StyledNumber component="span">
            {minutes}
            <StyledLetter component="span">m</StyledLetter>
          </StyledNumber>
        </Cell>
        <Cell>
          <StyledNumber component="span">
            {seconds}
            <StyledLetter component="span">s</StyledLetter>
          </StyledNumber>
        </Cell>
      </Stack>
    </Stack>
  );
};
