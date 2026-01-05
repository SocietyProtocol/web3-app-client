import { Paper, Stack, Skeleton } from "@mui/material";

export const AccountSkeleton = () => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      <Stack spacing={{ xs: 2, sm: 3 }}>
        {/* Header Skeleton */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={{ xs: 1.5, sm: 0 }}
        >
          <Skeleton
            variant="text"
            sx={{ width: { xs: "60%", sm: "40%" }, height: 40 }}
          />
          <Skeleton
            variant="rectangular"
            sx={{
              width: { xs: "100%", sm: 120 },
              height: 36,
              borderRadius: 50,
            }}
          />
        </Stack>

        {/* Avatar and Name Skeleton */}
        <Stack
          direction="row"
          spacing={{ xs: 1.5, sm: 2 }}
          alignItems="flex-start"
        >
          <Skeleton
            variant="circular"
            sx={{
              width: { xs: 48, sm: 64 },
              height: { xs: 48, sm: 64 },
            }}
          />
          <Stack spacing={1} flex={1} minWidth={0}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="40%" height={24} />
          </Stack>
        </Stack>

        {/* Bio Section Skeleton */}
        <Stack spacing={1}>
          <Skeleton variant="text" width="20%" height={20} />
          <Skeleton variant="text" width="100%" height={20} />
          <Skeleton variant="text" width="100%" height={20} />
          <Skeleton variant="text" width="80%" height={20} />
        </Stack>

        {/* Referral Code Skeleton */}
        <Stack spacing={1}>
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="text" width="50%" height={24} />
        </Stack>
      </Stack>
    </Paper>
  );
};
