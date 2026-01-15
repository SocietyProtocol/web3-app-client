import { formatAuto } from "@/utils/format";
import { Tooltip, Typography, TypographyProps } from "@mui/material";
import { useMemo } from "react";
import { formatUnits } from "viem";

export interface FormattedNumberProps
  extends Omit<TypographyProps, "children"> {
  value?: number | string | bigint;
  scaleDownDecimals?: number;
  minDecimals?: number;
  maxDecimals?: number;
  minThreshold?: number;
  trimTrailingZeros?: boolean;
  symbol?: string;
}

export const FormattedNumber: React.FC<FormattedNumberProps> = ({
  value,
  scaleDownDecimals,
  minDecimals,
  maxDecimals,
  minThreshold,
  trimTrailingZeros = false,
  symbol,
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
    });
  }, [maxDecimals, minDecimals, minThreshold, trimTrailingZeros, num]);

  return (
    num !== undefined && (
      <Tooltip title={num + (symbol ? ` ${symbol}` : "")} arrow>
        <Typography {...typographyProps}>
          {formatted} {symbol}
        </Typography>
      </Tooltip>
    )
  );
};
