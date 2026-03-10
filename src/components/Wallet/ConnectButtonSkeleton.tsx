import { Stack, Skeleton } from "@mui/material";
import type { SxProps } from "@mui/system";

export const ConnectButtonSkeleton = ({
  fullWidth,
  sx,
}: {
  fullWidth?: boolean;
  sx?: SxProps;
}) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={{ xs: 0.5, sm: 0.75, md: 1 }}
    sx={[
      {
        width: fullWidth ? "100%" : 180,
        height: {
          xs: 32,
          sm: 40,
          md: 48,
        },
        minWidth: {
          sm: "100px",
        },
        borderRadius: 50,
        bgcolor: "action.disabledBackground",
        px: 2,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <Skeleton variant="circular" width={24} height={24} />
    <Skeleton
      variant="text"
      height={24}
      sx={{ borderRadius: 1, flexGrow: 1 }}
    />
    <Skeleton variant="text" height={24} width={12} sx={{ borderRadius: 1 }} />
  </Stack>
);
