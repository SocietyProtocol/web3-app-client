import { Avatar as MUIAvatar, Skeleton, SxProps, Theme } from "@mui/material";
import { URLS } from "@/consts/urls";
import { mergeSx } from "@/utils/sx";

const IPFS_CID_IN_URL = /\/ipfs\/([^/?#]+)/;

/**
 * Turn a stored image reference into a URL the browser can load. IPFS
 * references are pointed at the Filebase gateway. A data: image is returned
 * as is: the only ones that reach the browser are files the user has just
 * chosen in a form (Graph responses drop stored data-URI photos on the
 * server, see lib/strip-data-uri), and previews must show them.
 */
export function resolveImageSrc(src?: string | null): string | undefined {
  if (!src) return undefined;
  // Checked before the IPFS rules: base64 can contain "/ipfs/".
  if (src.startsWith("data:image/")) {
    return src;
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
