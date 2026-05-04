import {
  alpha,
  styled,
  ToggleButton,
  toggleButtonGroupClasses,
} from "@mui/material";

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
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: tierColor,
    transition: theme.transitions.create(["background-color", "border-color"]),

    "&.Mui-selected": {
      borderColor: tierColor,
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
    "&&": {
      [`&&.${toggleButtonGroupClasses.firstButton}, &&.${toggleButtonGroupClasses.middleButton}, &&.${toggleButtonGroupClasses.lastButton}`]:
        {
          borderRadius: 4,
        },
      [`&&.${toggleButtonGroupClasses.middleButton}, &&.${toggleButtonGroupClasses.lastButton}`]:
        {
          marginLeft: 0,
          borderLeftColor: "transparent",
        },
      [`&&.${toggleButtonGroupClasses.middleButton}.Mui-selected, &&.${toggleButtonGroupClasses.lastButton}.Mui-selected`]:
        {
          borderLeft: `1px solid ${tierColor}`,
        },
    },
  };
});
