import { useMediaQuery } from "@mui/material";

interface UseReponsiveValueProps<T> {
  xs: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

export const useReponsiveValue = <T>(props: UseReponsiveValueProps<T>): T => {
  const { xs, sm, md, lg, xl } = props;
  const isSm = useMediaQuery((theme) => theme.breakpoints.only("sm"));
  const isMd = useMediaQuery((theme) => theme.breakpoints.only("md"));
  const isLg = useMediaQuery((theme) => theme.breakpoints.only("lg"));
  const isXl = useMediaQuery((theme) => theme.breakpoints.only("xl"));

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
