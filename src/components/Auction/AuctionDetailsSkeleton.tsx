import { Box, Skeleton, Stack } from "@mui/material";

export const AuctionDetailsSkeleton = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: { xs: 3, sm: 4, md: 6 },
      }}
    >
      {/* Header Skeleton */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" width={120} height={36} />
      </Box>

      {/* Stats/Countdown Row - works for both active and inactive */}
      <Stack
        direction="row"
        spacing={{ xs: 2, md: 1 }}
        alignItems="center"
        justifyContent="space-between"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            flex: 1,
          }}
        >
          <Skeleton variant="text" width="50%" height={24} />
          <Skeleton variant="text" width="70%" height={32} />
        </Box>
      </Stack>

      {/* Main Content Section - hybrid layout */}
      <Stack direction="row" spacing={{ xs: 3, sm: 4, lg: 2 }}>
        {/* Right side - could be chart or card */}
        <Box
          sx={{
            flex: 1,
            minHeight: 400,
            backgroundColor: "transparent",
            border: (theme) => `1px solid ${theme.palette.border.area}`,
            borderRadius: "12px",
            padding: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Skeleton variant="text" width={150} height={32} />
          </Box>
          <Skeleton
            variant="rectangular"
            sx={{ flex: 1, borderRadius: "8px" }}
          />
        </Box>
      </Stack>
    </Box>
  );
};
