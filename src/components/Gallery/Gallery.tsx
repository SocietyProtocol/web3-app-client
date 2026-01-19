import { usePrevious } from "@/hooks/usePrevious";
import { useResponsiveHeightValue } from "@/hooks/useResponsiveHeightValue";
import { useResponsiveValue } from "@/hooks/useResponsiveValue";
import { useIsMounted } from "@/hooks/useIsMounted";

import {
  Box,
  Grid,
  Pagination,
  PaginationItem,
  Stack,
  Typography,
} from "@mui/material";
import { ReactNode, useEffect, useMemo, ReactElement } from "react";

export interface GalleryGridConfig {
  xs: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface GalleryProps<T extends { id: number | string }> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  renderSkeleton?: () => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  columns?: GalleryGridConfig;
  rows?: GalleryGridConfig;
}

const defaultColumns: GalleryGridConfig = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
};

const defaultRows: GalleryGridConfig = {
  xs: 2,
  sm: 3,
  md: 4,
  lg: 5,
};

export const Gallery = <T extends { id: number | string }>({
  items,
  renderItem,
  renderSkeleton,
  loading = false,
  emptyMessage = "No items found",
  currentPage,
  onPageChange,
  columns = defaultColumns,
  rows = defaultRows,
}: GalleryProps<T>): ReactElement | null => {
  const isMounted = useIsMounted();

  const rawColumnsPerPage = useResponsiveValue(columns);
  const rawRowsPerPage = useResponsiveHeightValue(rows);
  const columnsPerPage = Math.max(1, rawColumnsPerPage || 0);
  const rowsPerPage = Math.max(1, rawRowsPerPage || 0);

  const paginationSize = useResponsiveValue({
    xs: "small",
    sm: "medium",
    md: "large",
  }) as "small" | "medium" | "large";

  const showPaginationButtons = useResponsiveValue({
    xs: false,
    sm: true,
  });

  const boundaryCount = useResponsiveValue({
    xs: 0,
    sm: 1,
    md: 1,
    lg: 2,
  });

  const itemsPerPage = useMemo(
    () => columnsPerPage * rowsPerPage,
    [columnsPerPage, rowsPerPage],
  );

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentItems = useMemo(
    () =>
      items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [items, currentPage, itemsPerPage],
  );

  const prevPage = usePrevious(currentPage);
  const firstItemIndex = (currentPage - 1) * itemsPerPage;
  const prevFirstItemIndex = usePrevious(firstItemIndex);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    onPageChange(page);
  };

  // Handle page size changes - keep the same first item visible
  useEffect(() => {
    if (prevFirstItemIndex === null || currentPage !== prevPage) return;

    if (
      prevFirstItemIndex < (currentPage - 1) * itemsPerPage ||
      prevFirstItemIndex >= currentPage * itemsPerPage
    ) {
      const newPage = Math.floor(prevFirstItemIndex / itemsPerPage) + 1;
      const clampedNewPage = Math.min(Math.max(newPage, 1), totalPages || 1);
      onPageChange(clampedNewPage);
    }
  }, [
    itemsPerPage,
    prevFirstItemIndex,
    currentPage,
    prevPage,
    onPageChange,
    totalPages,
  ]);

  if (!isMounted) {
    return null;
  }

  return (
    <Stack spacing={4} alignItems="center" justifyContent="center" width="100%">
      <Grid
        container
        columns={columns}
        spacing={2}
        sx={{
          width: "100%",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          alignContent: "flex-start",
        }}
      >
        {loading ? (
          renderSkeleton ? (
            Array.from({ length: itemsPerPage }).map((_, index) => (
              <Grid
                size={1}
                key={`skeleton-${index}`}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {renderSkeleton()}
              </Grid>
            ))
          ) : null
        ) : items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 200,
              width: "100%",
            }}
          >
            <Typography variant="body1" color="text.primary" component="span">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          currentItems.map((item) => (
            <Grid
              size={1}
              key={item.id}
              sx={{
                display: "flex",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {renderItem(item)}
            </Grid>
          ))
        )}
      </Grid>
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          size={paginationSize}
          showFirstButton
          showLastButton
          hideNextButton={!showPaginationButtons}
          hidePrevButton={!showPaginationButtons}
          boundaryCount={boundaryCount}
          renderItem={(item) => <PaginationItem {...item} />}
        />
      )}
    </Stack>
  );
};
