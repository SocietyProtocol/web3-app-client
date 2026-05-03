import { SxProps } from "@mui/material";
import { useMemo } from "react";
import { generateColorsFromAddress } from "@/lib/color";
import { mergeSx } from "@/utils/sx";
import { ImageDisplay } from "./ImageDisplay";

export interface UserAvatarProps {
  address?: string;
  imageUrl?: string | null;
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps;
  loading?: boolean;
}

export const UserAvatar = ({
  address,
  imageUrl,
  size = 40,
  sx,
  loading,
}: UserAvatarProps) => {
  const colors = useMemo(
    () => (!imageUrl && address ? generateColorsFromAddress(address) : []),
    [address, imageUrl],
  );

  const gradientStyle = useMemo(
    () =>
      !imageUrl
        ? ({
            background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
          } as SxProps)
        : {},
    [imageUrl, colors],
  );

  return (
    <ImageDisplay
      loading={loading}
      {...(imageUrl && { src: imageUrl })}
      ariaLabel={address ? `Avatar for ${address}` : "User Avatar"}
      size={size}
      sx={mergeSx(sx, gradientStyle)}
    />
  );
};
