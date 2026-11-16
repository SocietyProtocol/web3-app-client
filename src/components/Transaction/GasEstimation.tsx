import { Box, Skeleton, SxProps, Theme, Typography } from "@mui/material";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { mergeSx } from "@/utils/sx";
import type { OutpostRouteKind } from "@/lib/outpost-routing";
import { FREE_LABEL, PAID_LABEL, paymentLabel } from "@/lib/payment-label";

interface GasEstimationProps {
  /** Who pays: from useTransaction's routeKind. Nothing shows while unknown. */
  routeKind: OutpostRouteKind | undefined;
  value?: bigint;
  isLoading?: boolean;
  isError?: boolean;
  sx?: SxProps<Theme>;
}

export const GasEstimation = ({
  routeKind,
  value,
  isLoading = false,
  isError = false,
  sx,
}: GasEstimationProps) => {
  const label = paymentLabel({
    routeKind,
    gas: value,
    gasLoading: isLoading,
    gasError: isError,
  });

  if (!label) {
    return null;
  }

  return (
    <Box
      sx={mergeSx(
        {
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          color: "text.secondary",
        },
        sx,
      )}
    >
      <LocalGasStationIcon sx={{ fontSize: 16 }} />
      {label.kind === "loading" ? (
        <Skeleton width={20} height={20} />
      ) : label.kind === "free" ? (
        <Typography variant="body2" color="inherit">
          {FREE_LABEL}
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="inherit">
            {label.feeUsd === undefined ? PAID_LABEL : `${PAID_LABEL}, about`}
          </Typography>
          {label.feeUsd !== undefined && (
            <FormattedNumber
              variant="body2"
              color="inherit"
              value={label.feeUsd}
              scaleDownDecimals={8}
              minThreshold={0.01}
              prefix="$"
            />
          )}
        </>
      )}
    </Box>
  );
};
