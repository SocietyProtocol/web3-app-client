import { Avatar as MUIAvatar, Skeleton, SxProps } from "@mui/material";
import { useMemo } from "react";
import { useProfile } from "../AccountSetup/useProfile";
import { generateColorsFromAddress } from "@/lib/color";
import { isAddress } from "viem";

export interface AvatarProps {
  address?: string;
  ensImage?: string | null;
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps;
  loading?: boolean;
}

export const Avatar = ({
  address,
  ensImage,
  size = 40,
  sx,
  loading,
}: AvatarProps) => {
  const {
    profileData: { data: profileData },
  } = useProfile(address && isAddress(address) ? address : undefined);

  const image = profileData?.avatar || ensImage;

  const colors = useMemo(
    () => (!image && address ? generateColorsFromAddress(address) : []),
    [address, image]
  );

  if (loading) {
    return (
      <Skeleton
        variant="circular"
        sx={{
          ...sx,
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <MUIAvatar
      {...(image && { src: image })}
      aria-label={`Avatar for ${address}`}
      sx={{
        ...sx,
        width: size,
        height: size,
        ...(!image && {
          background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        }),

        "& .MuiAvatar-fallback": {
          display: "none",
        },
      }}
    />
  );
};
