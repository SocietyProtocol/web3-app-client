import { useMediaQuery } from "@mui/material";

interface UseResponsiveHeightValueProps<T> {
  xs: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

const HeightBreakpoints = {
  xs: 480,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};

export const useResponsiveHeightValue = <T,>(
  props: UseResponsiveHeightValueProps<T>,
): T => {
  const { xs, sm, md, lg, xl } = props;
  const isSm = useMediaQuery(`(min-height:${HeightBreakpoints.sm}px)`, {
    defaultMatches: true,
    noSsr: true,
  });
  const isMd = useMediaQuery(`(min-height:${HeightBreakpoints.md}px)`, {
    defaultMatches: true,
    noSsr: true,
  });
  const isLg = useMediaQuery(`(min-height:${HeightBreakpoints.lg}px)`, {
    defaultMatches: true,
    noSsr: true,
  });
  const isXl = useMediaQuery(`(min-height:${HeightBreakpoints.xl}px)`, {
    defaultMatches: true,
    noSsr: true,
  });

  // Return largest matching breakpoint with fallback cascade
  if (isXl && xl !== undefined) return xl;
  if (isLg && lg !== undefined) return lg;
  if (isMd && md !== undefined) return md;
  if (isSm && sm !== undefined) return sm;
  return xs;
};
