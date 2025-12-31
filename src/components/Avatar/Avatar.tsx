import { Avatar as MUIAvatar, SxProps } from "@mui/material";
import { useMemo } from "react";
import { useProfile } from "../AccountSetup/useProfile";
import { Hex } from "viem";

export interface AvatarProps {
  address?: string;
  ensImage?: string | null;
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps;
}

const generateColorsFromAddress = (address: string): [string, string] => {
  // Simple hash function to generate deterministic colors from address
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate first color
  const hue1 = Math.abs(hash % 360);
  const saturation1 = 65 + (Math.abs(hash) % 20);
  const lightness1 = 55 + (Math.abs(hash >> 8) % 15);

  // Generate second color (offset hue for nice gradient)
  const hue2 = (hue1 + 40 + (Math.abs(hash >> 16) % 80)) % 360;
  const saturation2 = 65 + (Math.abs(hash >> 12) % 20);
  const lightness2 = 45 + (Math.abs(hash >> 4) % 15);

  return [
    `hsl(${hue1}, ${saturation1}%, ${lightness1}%)`,
    `hsl(${hue2}, ${saturation2}%, ${lightness2}%)`,
  ];
};

export const Avatar = ({ address, ensImage, size = 40, sx }: AvatarProps) => {
  const {
    profileData: { data: profileData },
  } = useProfile(address ? (address as Hex) : undefined);

  const image = profileData?.avatar || ensImage;

  const colors = useMemo(
    () => (!image && address ? generateColorsFromAddress(address) : []),
    [address, image]
  );

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
