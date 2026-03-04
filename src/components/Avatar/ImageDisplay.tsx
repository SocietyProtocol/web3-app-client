import { Avatar as MUIAvatar, Skeleton, SxProps } from "@mui/material";

export interface ImageDisplayProps {
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps;
  loading?: boolean;
  src?: string | null;
  ariaLabel?: string;
}

export const ImageDisplay = ({
  src,
  size = 40,
  sx,
  loading,
  ariaLabel,
}: ImageDisplayProps) => {
  if (loading) {
    return (
      <Skeleton
        variant="circular"
        sx={[
          ...(Array.isArray(sx) ? sx : [sx]),
          {
            width: size,
            height: size,
          },
        ]}
      />
    );
  }

  return (
    <MUIAvatar
      {...(src && { src: src })}
      aria-label={ariaLabel}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        {
          width: size,
          height: size,

          "& .MuiAvatar-fallback": {
            display: "none",
          },
        },
      ]}
    />
  );
};
