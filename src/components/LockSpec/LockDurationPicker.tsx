"use client";

import { Box, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { LOCK_DURATIONS } from "./consts";
import { LockDuration } from "./types";

interface LockDurationPickerProps {
  selected: LockDuration;
  onSelect: (duration: LockDuration) => void;
}

export const LockDurationPicker = ({
  selected,
  onSelect,
}: LockDurationPickerProps) => (
  <Stack direction="row" spacing={1}>
    {LOCK_DURATIONS.map((duration) => {
      const isSelected = selected === duration;
      return (
        <Box
          key={duration}
          onClick={() => onSelect(duration)}
          sx={{
            cursor: "pointer",
            px: 0.5,
            py: 0.125,
            fontSize: { xs: "1rem", sm: "1.125rem" },
            fontWeight: isSelected ? 600 : 400,
            userSelect: "none",
            borderRadius: 1,
            border: "1px solid",
            borderColor: isSelected ? "success.light" : "transparent",
            bgcolor: isSelected ? "background.paperDark" : "transparent",
            color: (theme) =>
              isSelected
                ? theme.palette.primary.main
                : alpha(theme.palette.primary.main, 0.8),
            transition:
              "color 0.15s, border-color 0.15s, background-color 0.15s",
            "&:hover": {
              color: "primary.main",
            },
          }}
        >
          {duration}Y
        </Box>
      );
    })}
  </Stack>
);
