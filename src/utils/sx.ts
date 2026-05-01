import { SxProps, Theme } from "@mui/material";

export const mergeSx = (
  ...styles: Array<SxProps<Theme> | undefined>
): SxProps<Theme> => {
  return styles.flatMap((style) => {
    if (style === undefined) return [];
    return Array.isArray(style) ? style : [style];
  });
};
