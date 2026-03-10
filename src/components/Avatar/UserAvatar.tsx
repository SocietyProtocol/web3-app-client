import { SxProps } from "@mui/material";
import { useMemo } from "react";
import { generateColorsFromAddress } from "@/lib/color";
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

  return (
    <ImageDisplay
      loading={loading}
      {...(imageUrl && { src: imageUrl })}
      ariaLabel={address ? `Avatar for ${address}` : "User Avatar"}
      size={size}
      sx={[
        ...(Array.isArray(sx) ? sx : [sx]),
        !imageUrl && {
          background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        },
      ]}
    />
  );
};
