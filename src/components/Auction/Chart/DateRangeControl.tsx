import { ToggleButton, ToggleButtonGroup } from "@mui/material";

export interface DateRangeControlProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
  ranges: string[];
}

export const DateRangeControl = ({
  selectedRange,
  onRangeChange,
  ranges,
}: DateRangeControlProps) => {
  return (
    <ToggleButtonGroup
      value={selectedRange}
      exclusive
      onChange={(_, newValue) => {
        if (newValue !== null) {
          onRangeChange(newValue);
        }
      }}
      size="small"
      sx={{
        gap: 0.5,
      }}
    >
      {ranges.map((range) => (
        <ToggleButton
          key={range}
          value={range}
          sx={{
            minWidth: 48,
            height: 32,
            border: "none !important",
            bgcolor: "background.toggleButton",
            color: "text.secondary",
            "&.Mui-selected": {
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            },
            "&:hover": {
              bgcolor: "background.toggleButtonHover",
            },
          }}
        >
          {range}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};
