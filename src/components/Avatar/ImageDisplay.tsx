import { Avatar as MUIAvatar, Skeleton, SxProps, Theme } from "@mui/material";
import { URLS } from "@/consts/urls";
import { mergeSx } from "@/utils/sx";

const IPFS_CID_IN_URL = /\/ipfs\/([^/?#]+)/;

export function resolveImageSrc(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("data:image/")) {
    return undefined;
  }
  if (src.startsWith("ipfs://")) {
    return `${URLS.IPFS_GATEWAY}/${src.slice("ipfs://".length)}`;
  }
  const match = src.match(IPFS_CID_IN_URL);
  if (match) {
    return `${URLS.IPFS_GATEWAY}/${match[1]}`;
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
      slotProps={{
        img: { referrerPolicy: "no-referrer" },
      }}
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
