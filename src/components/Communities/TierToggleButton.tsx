import { alpha, styled, ToggleButton } from "@mui/material";

interface TierToggleButtonProps {
  tierColor: string;
}

export const TierToggleButton = styled(ToggleButton, {
  shouldForwardProp: (prop) => prop !== "tierColor",
})<TierToggleButtonProps>(({ theme, tierColor }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
  height: 32,
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  paddingTop: theme.spacing(0.75),
  paddingBottom: theme.spacing(0.75),
  borderRadius: "4px !important",
  border: "none !important",
  backgroundColor: "transparent !important",
  color: `${tierColor} !important`,
  transition: theme.transitions.create(["background-color", "border-color"]),
  "&.Mui-selected": {
    border: `1px solid ${tierColor} !important`,
    backgroundColor: `${alpha(tierColor, 0.1)} !important`,
  },
  "&:hover": {
    backgroundColor: `${alpha(tierColor, 0.06)} !important`,
  },
  "&.Mui-selected:hover": {
    backgroundColor: `${alpha(tierColor, 0.15)} !important`,
  },
  "&:focus-visible": {
    outline: `2px solid ${tierColor}`,
    outlineOffset: 2,
  },
}));
