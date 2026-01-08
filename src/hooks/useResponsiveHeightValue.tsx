import { useMediaQuery } from "@mui/material";

interface UseReponsiveHeightValueProps<T> {
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

export const useReponsiveHeightValue = <T,>(
  props: UseReponsiveHeightValueProps<T>
): T => {
  const { xs, sm, md, lg, xl } = props;
  const isSm = useMediaQuery(`(min-height:${HeightBreakpoints.sm}px)`);
  const isMd = useMediaQuery(`(min-height:${HeightBreakpoints.md}px)`);
  const isLg = useMediaQuery(`(min-height:${HeightBreakpoints.lg}px)`);
  const isXl = useMediaQuery(`(min-height:${HeightBreakpoints.xl}px)`);

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
