import { SxProps, Theme } from "@mui/material";

export const mergeSx = (
  ...styles: Array<SxProps<Theme> | undefined | false>
): SxProps<Theme> => {
  return styles.flatMap((style) => {
    if (style === undefined || style === false) return [];
    return Array.isArray(style) ? style : [style];
  });
};
