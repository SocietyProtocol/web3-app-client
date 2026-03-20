import { Box, Skeleton, SxProps } from "@mui/material";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";

interface GasEstimationProps {
  value?: bigint;
  isLoading?: boolean;
  isError?: boolean;
  sx?: SxProps;
}

export const GasEstimation = ({
  value,
  isLoading = false,
  isError = false,
  sx,
}: GasEstimationProps) => {
  if (isError || (!isLoading && value === undefined)) {
    return null;
  }

  return (
    <Box
      sx={[
        {
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          color: "text.secondary",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <LocalGasStationIcon sx={{ fontSize: 16 }} />
      {isLoading ? (
        <Skeleton width={20} height={20} />
      ) : (
        <FormattedNumber
          variant="body2"
          color="inherit"
          value={value}
          scaleDownDecimals={8}
          minThreshold={0.01}
          prefix="$"
        />
      )}
    </Box>
  );
};
