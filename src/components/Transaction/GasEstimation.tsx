import {
  Box,
  Skeleton,
  SxProps,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { mergeSx } from "@/utils/sx";
import type { OutpostRouteKind } from "@/lib/outpost-routing";
import {
  FREE_LABEL,
  PAID_LABEL,
  PaymentLabel,
  paymentLabel,
} from "@/lib/payment-label";

interface GasEstimationProps {
  /** Who pays: from useTransaction's routeKind. Nothing shows while unknown. */
  routeKind: OutpostRouteKind | undefined;
  value?: bigint;
  isLoading?: boolean;
  isError?: boolean;
  /** Only the icon, with who pays in its tooltip, for tight rows. */
  compact?: boolean;
  sx?: SxProps<Theme>;
}

export const GasEstimation = ({
  routeKind,
  value,
  isLoading = false,
  isError = false,
  compact = false,
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

  const text =
    label.kind === "loading" ? (
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
            hideTooltip={compact}
          />
        )}
      </>
    );

  const boxSx = mergeSx(
    {
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      color: "text.secondary",
    },
    sx,
  );

  if (compact) {
    return (
      <Tooltip
        arrow
        title={
          label.kind === "loading" ? (
            ""
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {text}
            </Box>
          )
        }
      >
        <Box sx={boxSx} aria-label={ariaLabel(label)}>
          <LocalGasStationIcon sx={{ fontSize: 16 }} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box data-testid="transaction-gas-estimate" sx={boxSx}>
      <LocalGasStationIcon sx={{ fontSize: 16 }} />
      {text}
    </Box>
  );
};

const ariaLabel = (label: PaymentLabel) =>
  label.kind === "loading"
    ? undefined
    : label.kind === "free"
      ? FREE_LABEL
      : PAID_LABEL;
