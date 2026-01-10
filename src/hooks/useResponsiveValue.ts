import { Theme, useMediaQuery } from "@mui/material";

interface UseResponsiveValueProps<T> {
  xs: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

export const useResponsiveValue = <T>(props: UseResponsiveValueProps<T>): T => {
  const { xs, sm, md, lg, xl } = props;
  
  // Check breakpoints from largest to smallest using up() queries
  // This ensures only one media query matches at a time, improving performance
  const isXlUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("xl"));
  const isLgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));
  const isMdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"));
  const isSmUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("sm"));

  // Return the first available value for the current breakpoint
  if (isXlUp && xl !== undefined) {
    return xl;
  }

  if (isLgUp && lg !== undefined) {
    return lg;
  }

  if (isMdUp && md !== undefined) {
    return md;
  }

  if (isSmUp && sm !== undefined) {
    return sm;
  }

  return xs;
};
