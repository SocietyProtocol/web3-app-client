import { usePrevious } from "@/hooks/usePrevious";
import { useResponsiveHeightValue } from "@/hooks/useResponsiveHeightValue";
import { useResponsiveValue } from "@/hooks/useResponsiveValue";

import { Grid, Pagination, PaginationItem, Stack } from "@mui/material";
import { ReactNode, useEffect, useMemo } from "react";

const gallerySizeBreakpoints = {
  xs: 200,
  sm: 416,
  md: 648,
  lg: 872,
};

export interface GalleryProps {
  items: ReactNode[];
  itemWidth: number;
  itemHeight: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const Gallery = ({
  items,
  itemWidth,
  itemHeight,
  currentPage,
  onPageChange,
}: GalleryProps) => {
  const itemsPerSize = useMemo(
    () => ({
      xs: Math.floor(gallerySizeBreakpoints.xs / itemWidth),
      sm: Math.floor(gallerySizeBreakpoints.sm / itemWidth),
      md: Math.floor(gallerySizeBreakpoints.md / itemWidth),
      lg: Math.floor(gallerySizeBreakpoints.lg / itemWidth),
    }),
    [itemWidth]
  );

  const rawColumnsPerPage = useResponsiveValue(itemsPerSize);
  const rawRowsPerPage = useResponsiveHeightValue(itemsPerSize);
  const columnsPerPage = Math.max(1, rawColumnsPerPage || 0);
  const rowsPerPage = Math.max(1, rawRowsPerPage || 0);

  const paginationSize = useResponsiveValue({
    xs: "small",
    sm: "medium",
    md: "large",
  }) as "small" | "medium" | "large";

  const boundaryCount = useResponsiveValue({
    xs: 0,
    sm: 1,
    md: 1,
    lg: 2,
  });
  const showPaginationButtons = useResponsiveValue({
    xs: false,
    sm: true,
  });

  const spacing = useResponsiveValue({
    xs: 1,
    sm: 2,
    md: 3,
  });

  const itemsPerPage = columnsPerPage * rowsPerPage;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const prevPage = usePrevious(currentPage);

  const firstItemIndex = (currentPage - 1) * itemsPerPage;
  const prevFirstItemIndex = usePrevious(firstItemIndex);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    page: number
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

  return (
    <Stack
      spacing={spacing}
      justifyContent="center"
      alignItems="center"
      width="100%"
    >
      <Grid
        container
        columns={columnsPerPage}
        spacing={spacing}
        sx={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
          alignContent: "flex-start",
          width: (theme) =>
            `calc(${columnsPerPage * itemWidth}px + ${theme.spacing(
              spacing * (columnsPerPage - 1)
            )})`,
          height: (theme) =>
            `calc(${rowsPerPage * itemHeight}px + ${theme.spacing(
              spacing * (rowsPerPage - 1)
            )})`,
        }}
      >
        {currentItems.map((item, index) => (
          <Grid
            size={1}
            key={index}
            sx={{
              display: "flex",
              justifyContent: "center",
              width: itemWidth,
              height: itemHeight,
              overflow: "hidden",
            }}
          >
            {item}
          </Grid>
        ))}
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
