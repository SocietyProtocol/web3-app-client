import { Grid, Paper, Skeleton, Stack } from "@mui/material";

export const ProfileDataCardSkeleton = () => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: 2,
        boxShadow: "none",
        flex: 1,
      }}
    >
      <Grid
        container
        spacing={2}
        columns={{
          xs: 1,
          sm: 2,
        }}
        sx={{
          height: "100%",
        }}
      >
        <Grid
          size={1}
          container
          direction="column"
          justifyContent="space-between"
          spacing={2}
        >
          <Stack spacing={1}>
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="text" width="80%" height={20} />
          </Stack>

          <Stack spacing={1}>
            <Skeleton variant="text" width="50%" height={14} />
            <Skeleton variant="text" width="40%" height={20} />
          </Stack>
        </Grid>

        <Grid
          size={1}
          container
          direction="column"
          justifyContent="space-between"
          spacing={2}
        >
          <Stack spacing={1}>
            <Skeleton variant="text" width="50%" height={14} />
            <Skeleton variant="text" width="70%" height={20} />
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};
