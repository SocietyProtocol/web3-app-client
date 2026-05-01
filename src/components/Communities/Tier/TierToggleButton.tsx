import { alpha, styled, ToggleButton } from "@mui/material";

interface TierToggleButtonProps {
  tierColor: string;
}

export const TierToggleButton = styled(ToggleButton, {
  shouldForwardProp: (prop) => prop !== "tierColor",
})<TierToggleButtonProps>(({ theme, tierColor }) => {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    height: 32,
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    borderRadius: 4,
    border: "none",
    backgroundColor: "transparent",
    color: tierColor,
    transition: theme.transitions.create(["background-color", "border-color"]),
    "&.Mui-selected": {
      border: `1px solid ${tierColor}`,
      backgroundColor: alpha(tierColor, 0.1),
    },
    "&:hover": {
      backgroundColor: alpha(tierColor, 0.06),
    },
    "&.Mui-selected:hover": {
      backgroundColor: alpha(tierColor, 0.15),
    },
    "&:focus-visible": {
      outline: `2px solid ${tierColor}`,
      outlineOffset: 2,
    },
  };
});
