import { Avatar as MUIAvatar, Skeleton, SxProps, Theme } from "@mui/material";
import { URLS } from "@/consts/urls";
import { mergeSx } from "@/utils/sx";

export function resolveImageSrc(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("ipfs://")) {
    return `${URLS.IPFS_GATEWAY}/${src.slice("ipfs://".length)}`;
  }
  if (src.startsWith("data:image/")) {
    return undefined;
  }
  return src;
}

export interface ImageDisplayProps {
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps<Theme>;
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
        sx={mergeSx(sx, {
          width: size,
          height: size,
        })}
      />
    );
  }

  const resolved = resolveImageSrc(src);

  return (
    <MUIAvatar
      {...(resolved && { src: resolved })}
      aria-label={ariaLabel}
      sx={mergeSx(sx, {
        width: size,
        height: size,

        "& .MuiAvatar-fallback": {
          display: "none",
        },
      })}
    />
  );
};
