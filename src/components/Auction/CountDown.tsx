"use client";

import {
  alpha,
  Stack,
  styled,
  Typography,
  TypographyProps,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { calculateTimeRemaining, TimeRemaining } from "./countdownUtils";
import { MILLISECONDS_PER_SECOND } from "@/consts/time";

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining(endTimestamp);
      setTimeLeft(remaining);

      // Clear interval if countdown has finished
      if (
        remaining.days === "00" &&
        remaining.hours === "00" &&
        remaining.minutes === "00" &&
        remaining.seconds === "00"
      ) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, MILLISECONDS_PER_SECOND);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endTimestamp]);

  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <Stack
      spacing={1}
      alignItems="center"
      role="timer"
      aria-label="Auction end countdown timer"
    >
      <Typography
        color="primary"
        fontWeight={400}
        sx={{
          fontSize: (theme) => theme.typography.pxToRem(16),
        }}
      >
        ENDS IN
      </Typography>
      <Stack direction="row" spacing={1} aria-live="polite" aria-atomic="true">
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
