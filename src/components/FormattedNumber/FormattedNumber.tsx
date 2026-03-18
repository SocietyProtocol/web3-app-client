import { formatAuto } from "@/utils/format";
import { Tooltip, Typography, TypographyProps } from "@mui/material";
import { useMemo } from "react";
import { formatUnits } from "viem";

export interface FormattedNumberProps extends Omit<
  TypographyProps,
  "children"
> {
  value?: number | string | bigint;
  scaleDownDecimals?: number;
  minDecimals?: number;
  maxDecimals?: number;
  minThreshold?: number;
  trimTrailingZeros?: boolean;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
  hideTooltip?: boolean;
}

export const FormattedNumber: React.FC<FormattedNumberProps> = ({
  value,
  scaleDownDecimals,
  minDecimals,
  maxDecimals,
  minThreshold,
  trimTrailingZeros,
  compact,
  prefix,
  suffix,
  hideTooltip,
  ...typographyProps
}) => {
  const num = useMemo(() => {
    if (value === undefined) return undefined;
    if (typeof value === "bigint") {
      if (scaleDownDecimals === undefined) {
        return Number(value);
      } else {
        return formatUnits(value, scaleDownDecimals);
      }
    }

    return value;
  }, [scaleDownDecimals, value]);

  const formatted = useMemo(() => {
    if (num === undefined) return undefined;

    return formatAuto(num, {
      minDecimals,
      maxDecimals,
      minThreshold,
      trimTrailingZeros,
      compact,
      prefix,
    });
  }, [
    num,
    minDecimals,
    maxDecimals,
    minThreshold,
    trimTrailingZeros,
    compact,
    prefix,
  ]);

  return (
    num !== undefined && (
      <Tooltip
        title={(prefix ? `${prefix}` : "") + num + (suffix ? ` ${suffix}` : "")}
        arrow
        disableHoverListener={hideTooltip}
      >
        <Typography {...typographyProps}>
          {formatted} {suffix}
        </Typography>
      </Tooltip>
    )
  );
};
