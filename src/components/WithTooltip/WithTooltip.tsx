import {
  SvgIconProps,
  Tooltip,
  TooltipProps,
  Typography,
  TypographyProps,
} from "@mui/material";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";

export interface WithTooltipProps extends TypographyProps {
  tooltip?: string;
  tooltipProps?: TooltipProps;
  iconProps?: SvgIconProps;
  iconPosition?: "start" | "end";
}

export const WithTooltip = ({
  tooltip,
  tooltipProps,
  iconProps,
  iconPosition = "start",
  children,
  ...typographyProps
}: WithTooltipProps) => {
  return (
    <Typography
      {...typographyProps}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        ...typographyProps.sx,
      }}
    >
      {iconPosition === "end" && children}
      {tooltip && (
        <Tooltip title={tooltip} arrow placement="top" {...tooltipProps}>
          <InfoOutlineIcon
            {...iconProps}
            sx={{ cursor: "help", fontSize: 16, ...iconProps?.sx }}
          />
        </Tooltip>
      )}
      {iconPosition === "start" && children}
    </Typography>
  );
};
