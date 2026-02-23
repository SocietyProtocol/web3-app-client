import { Box, Button, Grid, Stack, SxProps, Typography } from "@mui/material";
import { ReactNode } from "react";

interface CardRowProps<T extends { id: string }> {
  title: ReactNode;
  loading?: boolean;
  viewAllOnClick?: () => void;
  minCountForViewAll?: number;
  noneFoundText?: string;
  andMoreText?: string;
  viewAllText?: string;
  items?: T[];
  renderItem: (
    item: T & {
      loading?: boolean;
    },
  ) => ReactNode;
  sx?: SxProps;
}

export const CardRow = <T extends { id: string }>({
  title,
  loading = false,
  viewAllOnClick,
  minCountForViewAll = 6,
  noneFoundText = "No items found",
  andMoreText = "And {count} more...",
  viewAllText = "View All",
  items,
  renderItem,
  sx,
}: CardRowProps<T>) => {
  return (
    <Box
      sx={{
        ...sx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {items && items.length > minCountForViewAll && viewAllOnClick && (
          <Button variant="outlined" size="small" onClick={viewAllOnClick}>
            {viewAllText}
          </Button>
        )}
      </Stack>
      {items?.length === 0 ? (
        <Stack justifyContent="center" alignItems="center" minHeight={100}>
          <Typography variant="body1" color="text.secondary">
            {noneFoundText}
          </Typography>
        </Stack>
      ) : (
        <Grid
          container
          columns={{
            xs: 1,
            sm: 2,
            md: 4,
          }}
          spacing={{
            xs: 2,
            sm: 3,
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Grid
                  key={`skeleton-${index}`}
                  size={1}
                  sx={{
                    width: {
                      xs: "100%",
                      sm: "200px",
                    },
                  }}
                >
                  {renderItem({
                    id: `skeleton-${index}`,
                    loading: true,
                  } as T & { loading: boolean })}
                </Grid>
              ))
            : items?.slice(0, 6).map((item) => (
                <Grid
                  key={item.id}
                  size={1}
                  sx={{
                    width: {
                      xs: "100%",
                      sm: "200px",
                    },
                  }}
                >
                  {renderItem(item)}
                </Grid>
              ))}

          {items && items.length > 6 && (
            <Grid
              size={1}
              sx={{
                width: {
                  xs: "100%",
                  sm: "200px",
                },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                color="text.primary"
                sx={{ textAlign: "center" }}
              >
                {andMoreText.replace("{count}", String(items.length - 6))}
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};
