import { alpha, styled } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Button, StepIconProps } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";

interface ArrowConnectorProps {
  active?: boolean;
  completed?: boolean;
}

export const ArrowConnector = styled(ArrowForwardIcon, {
  shouldForwardProp: (prop) =>
    prop !== "active" && prop !== "completed" && prop !== "last",
})<ArrowConnectorProps>(({ theme, active, completed }) => ({
  margin: theme.spacing(0, 1.5),
  fontSize: 20,
  color: completed
    ? theme.palette.primary.main
    : active
    ? theme.palette.primary.main
    : theme.palette.action.disabled,
}));

const CustomStepIconRoot = styled("div")<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  width: 24,
  height: 24,
  minWidth: 24,
  minHeight: 24,
  maxWidth: 24,
  maxHeight: 24,
  aspectRatio: "1/1",
  display: "flex",
  borderRadius: "50%",
  justifyContent: "center",
  alignItems: "center",
  lineHeight: 1,
  fontWeight: 600,
  fontSize: "1rem",
  backgroundColor: theme.palette.action.disabledBackground,
  color: theme.palette.text.primary,
  ...(ownerState.active && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  }),
  ...(ownerState.completed && {
    backgroundColor: alpha(theme.palette.success.main, 0.5),
    color: theme.palette.success.main,
  }),
  [theme.breakpoints.down("sm")]: {
    width: 16,
    height: 16,
    minWidth: 16,
    minHeight: 16,
    maxWidth: 16,
    maxHeight: 16,
    fontSize: "0.875rem",
  },
}));

export function CustomStepIcon(props: StepIconProps) {
  const { active, completed, className, icon } = props;

  return (
    <CustomStepIconRoot
      ownerState={{ completed, active }}
      className={className}
    >
      {completed ? <CheckIcon fontSize="small" /> : icon}
    </CustomStepIconRoot>
  );
}

export const WizardButton = styled(Button)(() => ({
  height: 48,
  minWidth: "74px !important",
  width: "auto",
}));
