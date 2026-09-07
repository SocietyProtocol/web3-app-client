import { SxProps, Theme } from "@mui/material";
import { useMemo } from "react";
import { generateColorsFromAddress } from "@/lib/color";
import { mergeSx } from "@/utils/sx";
import { ImageDisplay, resolveImageSrc } from "./ImageDisplay";

export interface UserAvatarProps {
  address?: string;
  imageUrl?: string | null;
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps<Theme>;
  loading?: boolean;
}

export const UserAvatar = ({
  address,
  imageUrl,
  size = 40,
  sx,
  loading,
}: UserAvatarProps) => {
  const resolved = resolveImageSrc(imageUrl);

  const colors = useMemo(
    () => (!resolved && address ? generateColorsFromAddress(address) : []),
    [address, resolved],
  );

  const gradientStyle = useMemo(
    () =>
      !resolved
        ? ({
            background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
          } as SxProps)
        : {},
    [resolved, colors],
  );

  return (
    <ImageDisplay
      loading={loading}
      {...(resolved && { src: resolved })}
      ariaLabel={address ? `Avatar for ${address}` : "User Avatar"}
      size={size}
      sx={mergeSx(sx, gradientStyle)}
    />
  );
};
