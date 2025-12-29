import { Theme, useMediaQuery } from "@mui/material";

export const useIsMobile = () =>
  useMediaQuery((theme: Theme) => theme.breakpoints.down("md"));
