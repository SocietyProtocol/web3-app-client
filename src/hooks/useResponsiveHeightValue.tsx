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
  props: UseResponsiveHeightValueProps<T>
): T => {
  const { xs, sm, md, lg, xl } = props;
  const isSm = useMediaQuery(`(max-height:${HeightBreakpoints.sm}px)`, {
    defaultMatches: true,
    noSsr: true,
  });
  const isMd = useMediaQuery(`(max-height:${HeightBreakpoints.md}px)`, {
    defaultMatches: true,
    noSsr: true,
  });
  const isLg = useMediaQuery(`(max-height:${HeightBreakpoints.lg}px)`, {
    defaultMatches: true,
    noSsr: true,
  });
  const isXl = useMediaQuery(`(max-height:${HeightBreakpoints.xl}px)`, {
    defaultMatches: true,
    noSsr: true,
  });

  if (isXl) {
    return xl ?? lg ?? md ?? sm ?? xs;
  }

  if (isLg) {
    return lg ?? md ?? sm ?? xs;
  }

  if (isMd) {
    return md ?? sm ?? xs;
  }

  if (isSm) {
    return sm ?? xs;
  }

  return xs;
};
