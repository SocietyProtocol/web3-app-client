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

  // Mobile-first: check from largest to smallest
  const isXl = useMediaQuery((theme: Theme) => theme.breakpoints.up("xl"), {
    defaultMatches: true,
    noSsr: true,
  });
  const isLg = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"), {
    defaultMatches: true,
    noSsr: true,
  });
  const isMd = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"), {
    defaultMatches: true,
    noSsr: true,
  });
  const isSm = useMediaQuery((theme: Theme) => theme.breakpoints.up("sm"), {
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
