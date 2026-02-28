import { Box, Button, Stack, SxProps, Typography } from "@mui/material";
import { ReactNode } from "react";

interface CardRowProps<T extends { id: string }> {
  title: ReactNode;
  loading?: boolean;
  viewAllOnClick?: () => void;
  minCountForViewAll?: number;
  noneFoundText?: string;
  andMoreText?: string;
  viewAllText?: string;
  minItemWidth?: number;
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
  minItemWidth = 240,
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minItemWidth}px), 1fr))`,
            gap: 2,
            width: "100%",
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Box
                  key={`skeleton-${index}`}
                  sx={{
                    minWidth: {
                      xs: "100%",
                      sm: `${minItemWidth}px`,
                    },
                  }}
                >
                  {renderItem({
                    id: `skeleton-${index}`,
                    loading: true,
                  } as T & { loading: boolean })}
                </Box>
              ))
            : items?.slice(0, 6).map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    minWidth: {
                      xs: "100%",
                      sm: `${minItemWidth}px`,
                    },
                  }}
                >
                  {renderItem(item)}
                </Box>
              ))}

          {items && items.length > 6 && (
            <Box
              sx={{
                minWidth: {
                  xs: "100%",
                  sm: `${minItemWidth}px`,
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
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};
