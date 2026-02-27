import { Box, Skeleton } from "@mui/material";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";

interface GasEstimationProps {
  value?: bigint;
  isLoading?: boolean;
  isError?: boolean;
}

export const GasEstimation = ({
  value,
  isLoading = false,
  isError = false,
}: GasEstimationProps) => {
  if (isError || (!value && !isLoading)) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        color: "text.secondary",
      }}
    >
      <LocalGasStationIcon sx={{ fontSize: 16 }} />
      {isLoading ? (
        <Skeleton width={20} height={20} />
      ) : (
        <FormattedNumber
          variant="body2"
          color="text.secondary"
          value={value}
          scaleDownDecimals={8}
          minThreshold={0.01}
          prefix="$"
        />
      )}
    </Box>
  );
};
